try {
    $body = @{
        email = "info@alamalrestaurant.sa"
        password = "password123"
    } | ConvertTo-Json
    
    Write-Host "Testing business login..." -ForegroundColor Cyan
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/business/login" -Method POST -Body $body -ContentType "application/json"
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "Business: $($loginResponse.data.business.business_name)" -ForegroundColor Yellow
    Write-Host "Session Token: $($loginResponse.data.session_token)" -ForegroundColor Yellow
    
    # Test authenticated endpoints
    $headers = @{
        'x-session-token' = $loginResponse.data.session_token
        'x-business-id' = $loginResponse.data.business.id.ToString()
        'Content-Type' = 'application/json'
    }
    
    Write-Host "`nTesting offers endpoint..." -ForegroundColor Cyan
    $offersResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/business/my/offers" -Method GET -Headers $headers
    Write-Host "✅ Found $($offersResponse.data.Count) offers" -ForegroundColor Green
    
    Write-Host "`nTesting branches endpoint..." -ForegroundColor Cyan
    $branchesResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/business/my/branches" -Method GET -Headers $headers
    Write-Host "✅ Found $($branchesResponse.data.Count) branches" -ForegroundColor Green
    
    Write-Host "`n🎉 All tests passed! The authentication is working correctly." -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}