import forge from 'node-forge'
import logger from '../config/logger.js'
import appleCertificateValidator from './appleCertificateValidator.js'

/**
 * Apple Pass Signer
 *
 * Creates PKCS#7 detached signatures for Apple Wallet passes
 * Uses real Apple certificates loaded by appleCertificateValidator
 *
 * The signature process:
 * 1. Generate SHA-1 hashes of all files in the pass (pass.json, images, etc.)
 * 2. Create manifest.json with these hashes
 * 3. Sign the manifest.json file using PKCS#7 detached signature
 * 4. Include certificate chain (Pass Type ID cert + WWDR cert)
 * 5. Package everything into .pkpass ZIP file
 *
 * Apple Wallet will validate:
 * - The signature matches the manifest
 * - The manifest hashes match the actual files
 * - The certificate chain is valid
 * - The Pass Type ID matches the certificate
 */
class ApplePassSigner {
  /**
   * Sign manifest.json and create PKCS#7 detached signature
   *
   * @param {Object} manifest - The manifest object with file hashes
   * @returns {Buffer} The PKCS#7 signature as DER-encoded buffer
   */
  async signManifest(manifest) {
    try {
      logger.info('🔏 Signing manifest with Apple certificates...')

      // Get validated certificates
      const certs = appleCertificateValidator.getCertificates()

      if (!certs) {
        throw new Error('Apple certificates not loaded. Server may not have started properly.')
      }

      // Convert manifest to JSON string (this is what we're signing)
      const manifestJson = JSON.stringify(manifest)

      // Create PKCS#7 signed data
      const p7 = forge.pkcs7.createSignedData()

      // Add content (manifest.json) - we're creating a detached signature
      p7.content = forge.util.createBuffer(manifestJson, 'utf8')

      // Add Pass Type ID certificate to the signature
      p7.addCertificate(certs.passTypeCertificate)

      // Add WWDR certificate to complete the chain
      p7.addCertificate(certs.wwdrCertificate)

      // Add signer with private key
      p7.addSigner({
        key: certs.privateKey,
        certificate: certs.passTypeCertificate,
        digestAlgorithm: forge.pki.oids.sha1, // Apple Wallet requires SHA-1
        authenticatedAttributes: [
          {
            type: forge.pki.oids.contentType,
            value: forge.pki.oids.data
          },
          {
            type: forge.pki.oids.messageDigest
            // value will be auto-populated during signing
          },
          {
            type: forge.pki.oids.signingTime,
            value: new Date()
          }
        ]
      })

      // Sign with detached signature (signature doesn't include the content)
      p7.sign({ detached: true })

      // Convert to DER format (binary)
      const derSignature = forge.asn1.toDer(p7.toAsn1()).getBytes()

      // Convert to Buffer for Node.js
      const signatureBuffer = Buffer.from(derSignature, 'binary')

      logger.info(`✅ Manifest signed successfully (signature size: ${signatureBuffer.length} bytes)`)

      return signatureBuffer

    } catch (error) {
      logger.error('❌ Failed to sign manifest:', error)
      throw new Error(`Manifest signing failed: ${error.message}`)
    }
  }

  /**
   * Verify that a signature is valid (for testing)
   *
   * @param {Buffer} signatureBuffer - The PKCS#7 signature
   * @param {Object} manifest - The manifest object
   * @returns {boolean} True if signature is valid
   */
  async verifySignature(signatureBuffer, manifest) {
    try {
      logger.info('🔍 Verifying signature...')

      // Convert signature buffer to forge format
      const derSignature = signatureBuffer.toString('binary')
      const asn1 = forge.asn1.fromDer(derSignature)
      const p7 = forge.pkcs7.messageFromAsn1(asn1)

      // Set the content that was signed
      const manifestJson = JSON.stringify(manifest)
      p7.content = forge.util.createBuffer(manifestJson, 'utf8')

      // Get certificates
      const certs = appleCertificateValidator.getCertificates()

      // Create a certificate store with WWDR certificate
      const caStore = forge.pki.createCaStore([certs.wwdrCertificate])

      // Verify the signature
      const verified = p7.verify(caStore)

      logger.info(verified ? '✅ Signature verified successfully' : '❌ Signature verification failed')

      return verified

    } catch (error) {
      logger.error('❌ Signature verification error:', error)
      return false
    }
  }

  /**
   * Get certificate information for debugging
   *
   * @returns {Object} Certificate information
   */
  getCertificateInfo() {
    try {
      const certs = appleCertificateValidator.getCertificates()

      return {
        passTypeId: certs.passTypeId,
        teamId: certs.teamId,
        certificate: {
          subject: certs.passTypeCertificate.subject.attributes.map(attr => ({
            name: attr.name,
            value: attr.value
          })),
          issuer: certs.passTypeCertificate.issuer.attributes.map(attr => ({
            name: attr.name,
            value: attr.value
          })),
          validFrom: certs.passTypeCertificate.validity.notBefore,
          validTo: certs.passTypeCertificate.validity.notAfter,
          serialNumber: certs.passTypeCertificate.serialNumber
        },
        wwdr: {
          subject: certs.wwdrCertificate.subject.attributes.map(attr => ({
            name: attr.name,
            value: attr.value
          })),
          validFrom: certs.wwdrCertificate.validity.notBefore,
          validTo: certs.wwdrCertificate.validity.notAfter
        }
      }
    } catch (error) {
      logger.error('Failed to get certificate info:', error)
      return null
    }
  }
}

// Export singleton instance
export default new ApplePassSigner()
