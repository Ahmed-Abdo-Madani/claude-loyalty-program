import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

function RegistrationSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <SEO title="Registration Successful - Madna Platform" description="Your business has been successfully registered. Welcome to Madna Platform!" noindex={true} />
      
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-purple-600">
            🏢 Loyalty Platform
          </Link>
        </div>

        {/* Success Card */}
        <div className="bg-white shadow-lg rounded-lg p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Registration Submitted Successfully!
            <br />
            <span className="text-lg text-gray-600">تم تقديم التسجيل بنجاح!</span>
          </h1>

          <p className="text-gray-600 mb-6">
            Your business registration has been submitted and is now under review by our team.
            <br />
            <span className="text-sm">تم تقديم تسجيل أعمالك وهو قيد المراجعة من قبل فريقنا.</span>
          </p>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-800 mb-3">
              What happens next? - ماذا يحدث بعد ذلك؟
            </h3>
            <ul className="text-sm text-blue-700 space-y-2 text-left">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">1.</span>
                <span>Our team will review your application within 24-48 hours - سيراجع فريقنا طلبك خلال 24-48 ساعة</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">2.</span>
                <span>We'll verify your business documents and information - سنتحقق من وثائق ومعلومات أعمالك</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">3.</span>
                <span>You'll receive an email notification with the approval status - ستتلقى إشعاراً عبر البريد الإلكتروني بحالة الموافقة</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">4.</span>
                <span>Once approved, you can log in and start creating loyalty offers - بمجرد الموافقة، يمكنك تسجيل الدخول وإنشاء عروض الولاء</span>
              </li>
            </ul>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-left">
                <h4 className="font-medium text-yellow-800 mb-1">
                  Important - مهم
                </h4>
                <p className="text-sm text-yellow-700">
                  Please save your registration email for future reference. You'll need it to track your application status.
                  <br />
                  <span>احفظ بريد التسجيل للرجوع إليه مستقبلاً. ستحتاجه لتتبع حالة طلبك.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              to="/auth?mode=signin"
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 inline-block"
            >
              Go to Sign In - انتقل إلى تسجيل الدخول
            </Link>

            <Link
              to="/"
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 inline-block"
            >
              Back to Home - العودة إلى الرئيسية
            </Link>
          </div>
        </div>

        {/* Contact Support */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Have questions? - لديك أسئلة؟{' '}
            <a href="mailto:support@loyaltyplatform.sa" className="text-purple-600 hover:text-purple-500">
              Contact Support - تواصل مع الدعم
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegistrationSuccessPage