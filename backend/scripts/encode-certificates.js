/**
 * Apple Wallet Certificate Encoder for Production Deployment
 *
 * This script encodes your local Apple Wallet certificates to base64 format
 * for deployment to production environments (Render, AWS, Heroku, etc.)
 *
 * Usage:
 *   node backend/scripts/encode-certificates.js
 *
 * Output:
 *   - Base64-encoded certificate values
 *   - Ready to paste into Render environment variables
 *
 * Security:
 *   - Run this locally (never in production)
 *   - Copy output to production environment variables
 *   - Never commit the output to git
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('\n' + '='.repeat(70))
console.log('🔐 Apple Wallet Certificate Encoder for Production')
console.log('='.repeat(70) + '\n')

try {
  // Certificate file paths
  const certDir = path.join(__dirname, '..', 'certificates')
  const p12Path = path.join(certDir, 'pass.p12')
  const wwdrPath = path.join(certDir, 'AppleWWDRCAG4.pem')

  console.log('📂 Reading certificates from:', certDir)
  console.log('')

  // Check if files exist
  if (!fs.existsSync(p12Path)) {
    console.error('❌ Error: pass.p12 not found')
    console.error(`   Expected at: ${p12Path}`)
    console.error('\n💡 Make sure you have generated your Apple Wallet certificates first.')
    console.error('   See: backend/APPLE-WALLET-SETUP.md')
    process.exit(1)
  }

  if (!fs.existsSync(wwdrPath)) {
    console.error('❌ Error: AppleWWDRCAG4.pem not found')
    console.error(`   Expected at: ${wwdrPath}`)
    console.error('\n💡 Download the WWDR certificate from:')
    console.error('   https://www.apple.com/certificateauthority/')
    process.exit(1)
  }

  // Read certificate files
  console.log('📖 Reading pass.p12...')
  const p12Buffer = fs.readFileSync(p12Path)
  const p12Base64 = p12Buffer.toString('base64')

  console.log('📖 Reading AppleWWDRCAG4.pem...')
  const wwdrBuffer = fs.readFileSync(wwdrPath)
  const wwdrBase64 = wwdrBuffer.toString('base64')

  // Display results
  console.log('\n' + '✅ Certificates encoded successfully!'.green)
  console.log('')
  console.log('='.repeat(70))
  console.log('📋 RENDER.COM ENVIRONMENT VARIABLES')
  console.log('='.repeat(70))
  console.log('')
  console.log('Copy and paste these values into your Render.com dashboard:')
  console.log('(Dashboard → Your Service → Environment → Add Variable)')
  console.log('')
  console.log('-'.repeat(70))
  console.log('Variable Name: APPLE_CERT_P12_BASE64')
  console.log('-'.repeat(70))
  console.log(p12Base64)
  console.log('')
  console.log('-'.repeat(70))
  console.log('Variable Name: APPLE_CERT_WWDR_BASE64')
  console.log('-'.repeat(70))
  console.log(wwdrBase64)
  console.log('')
  console.log('='.repeat(70))
  console.log('')
  console.log('📊 Certificate Information:')
  console.log('-'.repeat(70))
  console.log(`   P12 Certificate Size:  ${p12Buffer.length.toLocaleString()} bytes`)
  console.log(`   P12 Base64 Length:     ${p12Base64.length.toLocaleString()} characters`)
  console.log(`   WWDR Certificate Size: ${wwdrBuffer.length.toLocaleString()} bytes`)
  console.log(`   WWDR Base64 Length:    ${wwdrBase64.length.toLocaleString()} characters`)
  console.log('')
  console.log('='.repeat(70))
  console.log('')
  console.log('🚀 NEXT STEPS:')
  console.log('-'.repeat(70))
  console.log('1. Open your Render.com dashboard')
  console.log('2. Navigate to your backend service → Environment tab')
  console.log('3. Click "Add Environment Variable"')
  console.log('4. Add both variables above (copy the entire base64 string)')
  console.log('5. Ensure these existing variables are also set:')
  console.log('   - APPLE_PASS_TYPE_ID=pass.me.madna.api')
  console.log('   - APPLE_TEAM_ID=NFQ6M7TFY2')
  console.log('   - APPLE_PASS_CERTIFICATE_PASSWORD=<your password>')
  console.log('6. Save changes and deploy')
  console.log('7. Check deployment logs for: "✅ Apple Wallet certificates loaded"')
  console.log('')
  console.log('='.repeat(70))
  console.log('')
  console.log('⚠️  SECURITY REMINDERS:')
  console.log('-'.repeat(70))
  console.log('• NEVER commit these base64 values to git')
  console.log('• NEVER share these values publicly')
  console.log('• Store them ONLY in Render environment variables')
  console.log('• Certificates expire: November 16, 2026')
  console.log('• Set reminder to renew: October 16, 2026')
  console.log('')
  console.log('='.repeat(70))
  console.log('')
  console.log('✨ Encoding complete! Ready for production deployment.')
  console.log('')

  // Optional: Save to temporary file for easy copying
  const outputPath = path.join(__dirname, 'certificate-env-vars.txt')
  const output = `# Apple Wallet Certificate Environment Variables
# Generated: ${new Date().toISOString()}
#
# SECURITY WARNING: Delete this file after copying to Render!
# NEVER commit this file to git!

APPLE_CERT_P12_BASE64=${p12Base64}

APPLE_CERT_WWDR_BASE64=${wwdrBase64}

# Also ensure these are set in Render:
# APPLE_PASS_TYPE_ID=pass.me.madna.api
# APPLE_TEAM_ID=NFQ6M7TFY2
# APPLE_PASS_CERTIFICATE_PASSWORD=<your password>
`

  fs.writeFileSync(outputPath, output)
  console.log('💾 Values also saved to: ' + outputPath)
  console.log('   (Remember to DELETE this file after copying to Render!)')
  console.log('')

} catch (error) {
  console.error('\n❌ Error encoding certificates:', error.message)
  console.error('\nStack trace:')
  console.error(error.stack)
  process.exit(1)
}
