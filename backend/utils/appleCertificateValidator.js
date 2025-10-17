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
 * DUAL-MODE LOADING:
 * ===================
 * - Development: Loads from file system (APPLE_PASS_CERTIFICATE_PATH)
 * - Production:  Loads from base64 environment variables (APPLE_CERT_P12_BASE64)
 *
 * Required environment variables (ALL ENVIRONMENTS):
 * - APPLE_PASS_TYPE_ID: Your Pass Type ID (e.g., pass.me.madna.api)
 * - APPLE_TEAM_ID: Your Apple Developer Team ID (10 characters)
 * - APPLE_PASS_CERTIFICATE_PASSWORD: Password for .p12 file
 *
 * Required environment variables (DEVELOPMENT):
 * - APPLE_PASS_CERTIFICATE_PATH: Path to .p12 certificate file
 * - APPLE_WWDR_CERTIFICATE_PATH: Path to WWDR .pem certificate
 *
 * Required environment variables (PRODUCTION):
 * - APPLE_CERT_P12_BASE64: Base64-encoded .p12 certificate
 * - APPLE_CERT_WWDR_BASE64: Base64-encoded WWDR .pem certificate
 */
class AppleCertificateValidator {
  constructor() {
    this.certificates = null
    this.isValid = false
    this.validationErrors = []
  }

  /**
   * Check if running in production environment
   */
  isProduction() {
    return process.env.NODE_ENV === 'production'
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
   * Validate required environment variables (supports both development and production)
   */
  validateEnvironmentVariables() {
    const errors = []

    // Common required variables for all environments
    const commonRequired = [
      'APPLE_PASS_TYPE_ID',
      'APPLE_TEAM_ID',
      'APPLE_PASS_CERTIFICATE_PASSWORD'
    ]

    commonRequired.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`Missing environment variable: ${varName}`)
      }
    })

    // Environment-specific validation
    if (this.isProduction()) {
      logger.info('📍 Production mode: Looking for base64-encoded certificates in environment variables')

      // Production requires base64-encoded certificates
      if (!process.env.APPLE_CERT_P12_BASE64) {
        errors.push('Missing environment variable: APPLE_CERT_P12_BASE64 (required in production)')
      }
      if (!process.env.APPLE_CERT_WWDR_BASE64) {
        errors.push('Missing environment variable: APPLE_CERT_WWDR_BASE64 (required in production)')
      }
    } else {
      logger.info('📍 Development mode: Looking for certificate files')

      // Development requires file paths
      if (!process.env.APPLE_PASS_CERTIFICATE_PATH) {
        errors.push('Missing environment variable: APPLE_PASS_CERTIFICATE_PATH (required in development)')
      }
      if (!process.env.APPLE_WWDR_CERTIFICATE_PATH) {
        errors.push('Missing environment variable: APPLE_WWDR_CERTIFICATE_PATH (required in development)')
      }
    }

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
   * Load and validate .p12 certificate (supports both file and base64)
   */
  async loadP12Certificate() {
    // Use appropriate loading method based on environment
    if (this.isProduction()) {
      return await this.loadP12FromEnvironment()
    } else {
      return await this.loadP12FromFile()
    }
  }

  /**
   * Load .p12 certificate from file system (development)
   */
  async loadP12FromFile() {
    const errors = []

    try {
      const certPath = path.resolve(process.env.APPLE_PASS_CERTIFICATE_PATH)

      // Check if file exists
      if (!fs.existsSync(certPath)) {
        errors.push(`Certificate file not found: ${certPath}`)
        return { isValid: false, errors }
      }

      logger.info(`📖 Loading .p12 certificate from file: ${certPath}`)

      // Read certificate file
      const p12Der = fs.readFileSync(certPath, 'binary')

      return this.parseP12Certificate(p12Der, errors)

    } catch (error) {
      if (error.message.includes('Invalid password')) {
        errors.push('Invalid certificate password (APPLE_PASS_CERTIFICATE_PASSWORD)')
      } else {
        errors.push(`Failed to load .p12 certificate from file: ${error.message}`)
      }
      return { isValid: false, errors }
    }
  }

  /**
   * Load .p12 certificate from base64 environment variable (production)
   */
  async loadP12FromEnvironment() {
    const errors = []

    try {
      const p12Base64 = process.env.APPLE_CERT_P12_BASE64

      if (!p12Base64) {
        errors.push('APPLE_CERT_P12_BASE64 environment variable is empty')
        return { isValid: false, errors }
      }

      logger.info('📖 Loading .p12 certificate from environment variable (base64)')

      // Decode base64 to binary
      const p12Der = Buffer.from(p12Base64, 'base64').toString('binary')

      return this.parseP12Certificate(p12Der, errors)

    } catch (error) {
      if (error.message.includes('Invalid password')) {
        errors.push('Invalid certificate password (APPLE_PASS_CERTIFICATE_PASSWORD)')
      } else if (error.message.includes('base64')) {
        errors.push('Invalid base64 encoding in APPLE_CERT_P12_BASE64')
      } else {
        errors.push(`Failed to load .p12 certificate from environment: ${error.message}`)
      }
      return { isValid: false, errors }
    }
  }

  /**
   * Parse .p12 certificate data (common logic for file and base64)
   */
  parseP12Certificate(p12Der, errors = []) {
    try {
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
      throw error // Re-throw to be caught by calling function
    }
  }

  /**
   * Load and validate WWDR certificate (supports both file and base64)
   */
  async loadWWDRCertificate() {
    // Use appropriate loading method based on environment
    if (this.isProduction()) {
      return await this.loadWWDRFromEnvironment()
    } else {
      return await this.loadWWDRFromFile()
    }
  }

  /**
   * Load WWDR certificate from file system (development)
   */
  async loadWWDRFromFile() {
    const errors = []

    try {
      const certPath = path.resolve(process.env.APPLE_WWDR_CERTIFICATE_PATH)

      // Check if file exists
      if (!fs.existsSync(certPath)) {
        errors.push(`WWDR certificate file not found: ${certPath}`)
        return { isValid: false, errors }
      }

      logger.info(`📖 Loading WWDR certificate from file: ${certPath}`)

      // Read certificate file
      const wwdrPem = fs.readFileSync(certPath, 'utf8')

      return this.parseWWDRCertificate(wwdrPem, errors)

    } catch (error) {
      errors.push(`Failed to load WWDR certificate from file: ${error.message}`)
      return { isValid: false, errors }
    }
  }

  /**
   * Load WWDR certificate from base64 environment variable (production)
   */
  async loadWWDRFromEnvironment() {
    const errors = []

    try {
      const wwdrBase64 = process.env.APPLE_CERT_WWDR_BASE64

      if (!wwdrBase64) {
        errors.push('APPLE_CERT_WWDR_BASE64 environment variable is empty')
        return { isValid: false, errors }
      }

      logger.info('📖 Loading WWDR certificate from environment variable (base64)')

      // Decode base64 to PEM string
      const wwdrPem = Buffer.from(wwdrBase64, 'base64').toString('utf8')

      return this.parseWWDRCertificate(wwdrPem, errors)

    } catch (error) {
      if (error.message.includes('base64')) {
        errors.push('Invalid base64 encoding in APPLE_CERT_WWDR_BASE64')
      } else {
        errors.push(`Failed to load WWDR certificate from environment: ${error.message}`)
      }
      return { isValid: false, errors }
    }
  }

  /**
   * Parse WWDR certificate data (common logic for file and base64)
   */
  parseWWDRCertificate(wwdrPem, errors = []) {
    try {
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
      throw error // Re-throw to be caught by calling function
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
