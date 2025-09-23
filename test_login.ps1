$loginData = @{
    email = "info@alamalrestaurant.sa"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/business/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "✅ Login Successful!" -ForegroundColor Green
    Write-Host "Business ID: $($response.data.business.id)" -ForegroundColor Yellow
    Write-Host "Business Name: $($response.data.business.business_name)" -ForegroundColor Yellow
    Write-Host "Session Token: $($response.data.session_token)" -ForegroundColor Yellow
    
    # Test authenticated endpoint
    $headers = @{
        'x-session-token' = $response.data.session_token
        'x-business-id' = $response.data.business.id
        'Content-Type' = 'application/json'
    }
    
    Write-Host "`n🔍 Testing authenticated offers endpoint..." -ForegroundColor Cyan
    $offersResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/business/my/offers" -Method GET -Headers $headers
    Write-Host "✅ Offers Retrieved: $($offersResponse.data.Count) offers found" -ForegroundColor Green
    
    Write-Host "`n🔍 Testing authenticated branches endpoint..." -ForegroundColor Cyan
    $branchesResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/business/my/branches" -Method GET -Headers $headers
    Write-Host "✅ Branches Retrieved: $($branchesResponse.data.Count) branches found" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}