import fs from 'fs'
import path from 'path'
import forge from 'node-forge'
import logger from '../config/logger.js'

/**
 * Apple Wallet Certificate Validator
 *
 * Validates and loads Apple Wallet Pass Type ID certificates and WWDR certificates
 * Used for signing .pkpass files with real Apple certificates
 *
 * Required environment variables:
 * - APPLE_PASS_TYPE_ID: Your Pass Type ID (e.g., pass.me.madna.api)
 * - APPLE_TEAM_ID: Your Apple Developer Team ID (10 characters)
 * - APPLE_PASS_CERTIFICATE_PATH: Path to .p12 certificate file
 * - APPLE_PASS_CERTIFICATE_PASSWORD: Password for .p12 file
 * - APPLE_WWDR_CERTIFICATE_PATH: Path to WWDR .pem certificate
 */
class AppleCertificateValidator {
  constructor() {
    this.certificates = null
    this.isValid = false
    this.validationErrors = []
  }

  /**
   * Validate and load all Apple Wallet certificates
   * @returns {Object} { isValid, certificates, errors }
   */
  async validateAndLoad() {
    try {
      logger.info('🍎 Validating Apple Wallet certificates...')

      // Reset state
      this.validationErrors = []
      this.isValid = false

      // Step 1: Validate environment variables
      const envValidation = this.validateEnvironmentVariables()
      if (!envValidation.isValid) {
        this.validationErrors.push(...envValidation.errors)
        return this.getValidationResult()
      }

      // Step 2: Load and validate .p12 certificate (Pass Type ID Certificate + Private Key)
      const p12Validation = await this.loadP12Certificate()
      if (!p12Validation.isValid) {
        this.validationErrors.push(...p12Validation.errors)
        return this.getValidationResult()
      }

      // Step 3: Load and validate WWDR certificate
      const wwdrValidation = await this.loadWWDRCertificate()
      if (!wwdrValidation.isValid) {
        this.validationErrors.push(...wwdrValidation.errors)
        return this.getValidationResult()
      }

      // Step 4: Verify certificate chain
      const chainValidation = this.verifyCertificateChain(
        p12Validation.certificate,
        wwdrValidation.certificate
      )
      if (!chainValidation.isValid) {
        this.validationErrors.push(...chainValidation.errors)
        return this.getValidationResult()
      }

      // Step 5: Check certificate expiration
      const expirationValidation = this.checkCertificateExpiration(p12Validation.certificate)
      if (expirationValidation.warnings.length > 0) {
        expirationValidation.warnings.forEach(warning => {
          logger.warn(`⚠️ ${warning}`)
        })
      }

      // All validations passed - store certificates
      this.certificates = {
        passTypeCertificate: p12Validation.certificate,
        privateKey: p12Validation.privateKey,
        wwdrCertificate: wwdrValidation.certificate,
        passTypeId: process.env.APPLE_PASS_TYPE_ID,
        teamId: process.env.APPLE_TEAM_ID
      }

      this.isValid = true

      logger.info('✅ Apple Wallet certificates validated successfully')
      logger.info(`   📋 Pass Type ID: ${this.certificates.passTypeId}`)
      logger.info(`   🏢 Team ID: ${this.certificates.teamId}`)
      logger.info(`   📅 Certificate expires: ${p12Validation.certificate.validity.notAfter.toISOString().split('T')[0]}`)

      return this.getValidationResult()

    } catch (error) {
      logger.error('❌ Apple Wallet certificate validation failed:', error)
      this.validationErrors.push(`Unexpected error: ${error.message}`)
      return this.getValidationResult()
    }
  }

  /**
   * Validate required environment variables
   */
  validateEnvironmentVariables() {
    const errors = []
    const required = [
      'APPLE_PASS_TYPE_ID',
      'APPLE_TEAM_ID',
      'APPLE_PASS_CERTIFICATE_PATH',
      'APPLE_PASS_CERTIFICATE_PASSWORD',
      'APPLE_WWDR_CERTIFICATE_PATH'
    ]

    required.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`Missing environment variable: ${varName}`)
      }
    })

    // Validate Team ID format (should be 10 characters)
    if (process.env.APPLE_TEAM_ID && process.env.APPLE_TEAM_ID.length !== 10) {
      errors.push(`Invalid APPLE_TEAM_ID format: should be 10 characters, got ${process.env.APPLE_TEAM_ID.length}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Load and validate .p12 certificate file
   */
  async loadP12Certificate() {
    const errors = []

    try {
      const certPath = path.resolve(process.env.APPLE_PASS_CERTIFICATE_PATH)

      // Check if file exists
      if (!fs.existsSync(certPath)) {
        errors.push(`Certificate file not found: ${certPath}`)
        return { isValid: false, errors }
      }

      // Read certificate file
      const p12Der = fs.readFileSync(certPath, 'binary')

      // Convert to ASN.1 and decrypt with password
      const p12Asn1 = forge.asn1.fromDer(p12Der)
      const p12 = forge.pkcs12.pkcs12FromAsn1(
        p12Asn1,
        process.env.APPLE_PASS_CERTIFICATE_PASSWORD
      )

      // Extract certificate and private key
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })

      // Validate we have the required bags
      if (!certBags[forge.pki.oids.certBag] || certBags[forge.pki.oids.certBag].length === 0) {
        errors.push('No certificate found in .p12 file')
        return { isValid: false, errors }
      }

      if (!keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || keyBags[forge.pki.oids.pkcs8ShroudedKeyBag].length === 0) {
        errors.push('No private key found in .p12 file')
        return { isValid: false, errors }
      }

      const certificate = certBags[forge.pki.oids.certBag][0].cert
      const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key

      // Verify certificate and key match
      const publicKeyModulus = certificate.publicKey.n.toString(16)
      const privateKeyModulus = privateKey.n.toString(16)

      if (publicKeyModulus !== privateKeyModulus) {
        errors.push('Certificate and private key do not match')
        return { isValid: false, errors }
      }

      logger.info('✅ .p12 certificate loaded and validated')

      return {
        isValid: true,
        errors: [],
        certificate,
        privateKey
      }

    } catch (error) {
      if (error.message.includes('Invalid password')) {
        errors.push('Invalid certificate password (APPLE_PASS_CERTIFICATE_PASSWORD)')
      } else {
        errors.push(`Failed to load .p12 certificate: ${error.message}`)
      }
      return { isValid: false, errors }
    }
  }

  /**
   * Load and validate WWDR certificate
   */
  async loadWWDRCertificate() {
    const errors = []

    try {
      const certPath = path.resolve(process.env.APPLE_WWDR_CERTIFICATE_PATH)

      // Check if file exists
      if (!fs.existsSync(certPath)) {
        errors.push(`WWDR certificate file not found: ${certPath}`)
        return { isValid: false, errors }
      }

      // Read certificate file
      const wwdrPem = fs.readFileSync(certPath, 'utf8')

      // Parse PEM certificate
      const certificate = forge.pki.certificateFromPem(wwdrPem)

      // Validate it's the correct WWDR certificate
      const subject = certificate.subject.getField('CN')
      if (!subject || !subject.value.includes('Apple Worldwide Developer Relations')) {
        errors.push('Invalid WWDR certificate: subject does not match expected Apple WWDR CA')
      }

      logger.info('✅ WWDR certificate loaded and validated')

      return {
        isValid: errors.length === 0,
        errors,
        certificate
      }

    } catch (error) {
      errors.push(`Failed to load WWDR certificate: ${error.message}`)
      return { isValid: false, errors }
    }
  }

  /**
   * Verify certificate chain (Pass Type ID cert is signed by WWDR cert)
   */
  verifyCertificateChain(passTypeCert, wwdrCert) {
    const errors = []

    try {
      // Verify the Pass Type ID certificate is signed by WWDR
      const verified = wwdrCert.verify(passTypeCert)

      if (!verified) {
        errors.push('Certificate chain validation failed: Pass Type ID certificate not signed by WWDR certificate')
      } else {
        logger.info('✅ Certificate chain verified')
      }

      return {
        isValid: verified,
        errors
      }

    } catch (error) {
      errors.push(`Certificate chain verification failed: ${error.message}`)
      return { isValid: false, errors }
    }
  }

  /**
   * Check certificate expiration and warn if expiring soon
   */
  checkCertificateExpiration(certificate) {
    const warnings = []
    const now = new Date()
    const expirationDate = certificate.validity.notAfter
    const daysUntilExpiration = Math.floor((expirationDate - now) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiration < 0) {
      warnings.push(`Certificate EXPIRED ${Math.abs(daysUntilExpiration)} days ago on ${expirationDate.toISOString().split('T')[0]}`)
    } else if (daysUntilExpiration < 30) {
      warnings.push(`Certificate expires in ${daysUntilExpiration} days on ${expirationDate.toISOString().split('T')[0]} - RENEW SOON!`)
    } else if (daysUntilExpiration < 60) {
      warnings.push(`Certificate expires in ${daysUntilExpiration} days on ${expirationDate.toISOString().split('T')[0]}`)
    }

    return { warnings }
  }

  /**
   * Get validation result
   */
  getValidationResult() {
    return {
      isValid: this.isValid,
      certificates: this.certificates,
      errors: this.validationErrors
    }
  }

  /**
   * Get loaded certificates (throws if not validated)
   */
  getCertificates() {
    if (!this.isValid || !this.certificates) {
      throw new Error('Certificates not loaded. Call validateAndLoad() first.')
    }
    return this.certificates
  }
}

// Export singleton instance
export default new AppleCertificateValidator()
