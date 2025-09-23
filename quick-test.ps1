$testLogin = '{"email": "info@alamalrestaurant.sa", "password": "password123"}'

try {
    Write-Host "Testing backend login endpoint..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/business/login" -Method POST -Body $testLogin -ContentType "application/json"
    Write-Host "✅ Backend login successful!" -ForegroundColor Green
    Write-Host "Business: $($response.data.business.business_name)" -ForegroundColor Yellow
    Write-Host "Token: $($response.data.session_token)" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Backend login failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}