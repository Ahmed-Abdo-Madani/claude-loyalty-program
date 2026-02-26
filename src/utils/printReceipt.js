export const generateReceiptHtml = (receipt, isRtl, apiBaseUrl) => {
    const dir = isRtl ? 'rtl' : 'ltr'
    const textAlign = isRtl ? 'right' : 'left'
    const oppositeAlign = isRtl ? 'left' : 'right'

    // Translations
    const t = {
        receiptNumber: isRtl ? 'رقم الإيصال' : 'Receipt #',
        date: isRtl ? 'التاريخ' : 'Date',
        branch: isRtl ? 'الفرع' : 'Branch',
        item: isRtl ? 'الصنف' : 'Item',
        quantity: isRtl ? 'الكمية' : 'Qty',
        price: isRtl ? 'السعر' : 'Price',
        total: isRtl ? 'المجموع' : 'Total',
        subtotal: isRtl ? 'المجموع الفرعي' : 'Subtotal',
        tax: isRtl ? 'الضريبة (15%)' : 'Tax (15%)',
        discount: isRtl ? 'الخصم' : 'Discount',
        grandTotal: isRtl ? 'الإجمالي' : 'Total',
        paymentMethod: isRtl ? 'طريقة الدفع' : 'Payment Method',
        cashReceived: isRtl ? 'المبلغ المستلم' : 'Cash Received',
        change: isRtl ? 'المتبقي' : 'Change',
        loyaltyQR: isRtl ? 'امسح الرمز للانضمام لبرنامج الولاء' : 'Scan to join our loyalty program',
        thankYou: isRtl ? 'شكراً لتعاملكم معنا!' : 'Thank you for your business!'
    }

    const businessName = (isRtl && receipt.business.name_ar) ? receipt.business.name_ar : receipt.business.name

    const logoSrc = receipt.business.logo_url
        ? (receipt.business.logo_url.startsWith('http') ? receipt.business.logo_url : `${apiBaseUrl}${receipt.business.logo_url}`)
        : null

    const itemsHtml = receipt.items.map(item => {
        const itemName = (isRtl && item.name_ar) ? item.name_ar : item.name
        return `
      <tr>
        <td style="text-align: ${textAlign}">${itemName}</td>
        <td style="text-align: center">${item.quantity}</td>
        <td style="text-align: ${textAlign}">${item.unit_price.toFixed(2)}</td>
        <td style="text-align: ${oppositeAlign}; font-weight: 600;">${item.total.toFixed(2)}</td>
      </tr>
    `
    }).join('')

    const formattedDate = new Date(receipt.sale.sale_date).toLocaleString(isRtl ? 'ar-SA' : 'en-US')

    return `
    <html dir="${dir}">
      <head>
        <title>Print Receipt</title>
        <style>
          @media print {
            @page { margin: 0; }
            body { margin: 0; padding: 10mm; }
          }
          body {
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 12px;
            color: #000;
            background: #fff;
            max-width: 80mm;
            margin: 0 auto;
            padding: 20px;
          }
          .text-center { text-align: center; }
          .text-right { text-align: ${isRtl ? 'left' : 'right'}; }
          .text-left { text-align: ${isRtl ? 'right' : 'left'}; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .text-sm { font-size: 11px; }
          .text-xl { font-size: 16px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .mt-1 { margin-top: 4px; }
          .mt-2 { margin-top: 8px; }
          .pt-2 { padding-top: 8px; }
          .pt-3 { padding-top: 12px; }
          .pt-4 { padding-top: 16px; }
          .pt-6 { padding-top: 24px; }
          .pb-4 { padding-bottom: 16px; }
          .h-16 { height: 64px; }
          .w-40 { width: 160px; }
          .h-40 { height: 160px; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .space-y-6 > * + * { margin-top: 24px; }
          .space-y-2 > * + * { margin-top: 8px; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .border-b { border-bottom: 1px dashed #000; }
          .border-t { border-top: 1px dashed #000; }
          .border-t-2 { border-top: 2px solid #000; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 8px; }
          th { padding: 8px 4px; border-bottom: 1px solid #000; }
          td { padding: 6px 4px; border-bottom: 1px dashed #ccc; }
          img { max-width: 100%; object-fit: contain; }
          * { color: #000 !important; }
        </style>
      </head>
      <body>
        <div class="space-y-6">
          <!-- Business Header -->
          <div class="text-center border-b pb-4">
            ${logoSrc ? `<img src="${logoSrc}" alt="Business Logo" class="h-16 mx-auto mb-3 object-contain" />` : ''}
            <h3 class="text-xl font-bold">${businessName}</h3>
            <p class="text-sm mt-1">${receipt.business.address}, ${receipt.business.city}</p>
            <p class="text-sm">${receipt.business.phone}</p>
          </div>

          <!-- Receipt Info -->
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="font-semibold">${t.receiptNumber}</span>
              <span class="font-bold">${receipt.sale.sale_number}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="font-semibold">${t.date}</span>
              <span>${formattedDate}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="font-semibold">${t.branch}</span>
              <span>${receipt.branch.name}</span>
            </div>
          </div>

          <!-- Items Table -->
          <div>
            <table>
              <thead>
                <tr>
                  <th style="text-align: ${textAlign}">${t.item}</th>
                  <th style="text-align: center">${t.quantity}</th>
                  <th style="text-align: ${textAlign}">${t.price}</th>
                  <th style="text-align: ${oppositeAlign}">${t.total}</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <!-- Totals -->
          <div class="space-y-2 pt-2">
            <div class="flex justify-between text-sm">
              <span>${t.subtotal}:</span>
              <span>${receipt.totals.subtotal.toFixed(2)} SAR</span>
            </div>
            <div class="flex justify-between text-sm">
              <span>${t.tax}:</span>
              <span>${receipt.totals.tax_amount.toFixed(2)} SAR</span>
            </div>
            ${receipt.totals.discount_amount > 0 ? `
              <div class="flex justify-between text-sm">
                <span>${t.discount}:</span>
                <span>-${receipt.totals.discount_amount.toFixed(2)} SAR</span>
              </div>
            ` : ''}
            <div class="flex justify-between text-xl font-bold border-t-2 pt-3 mt-2">
              <span>${t.grandTotal}:</span>
              <span>${receipt.totals.total.toFixed(2)} SAR</span>
            </div>
          </div>

          <!-- Payment Method -->
          <div class="border-t pt-4">
            <div class="flex justify-between text-sm mb-2">
              <span class="font-semibold">${t.paymentMethod}:</span>
              <span class="font-semibold" style="text-transform: capitalize;">${receipt.sale.payment_method}</span>
            </div>
            ${receipt.sale.payment_method === 'cash' && receipt.sale.payment_details ? `
              <div class="flex justify-between text-sm">
                <span>${t.cashReceived}:</span>
                <span>${(receipt.sale.payment_details.received || 0).toFixed(2)} SAR</span>
              </div>
              <div class="flex justify-between text-sm mt-1">
                <span>${t.change}:</span>
                <span>${(receipt.sale.payment_details.change || 0).toFixed(2)} SAR</span>
              </div>
            ` : ''}
          </div>

          <!-- Loyalty QR Code -->
          ${receipt.loyalty && receipt.loyalty.qr_code_data_url ? `
            <div class="text-center border-t pt-6">
              <p class="text-sm mb-3">${t.loyaltyQR}</p>
              <img src="${receipt.loyalty.qr_code_data_url}" alt="Loyalty QR" class="w-40 h-40 mx-auto object-contain" />
            </div>
          ` : ''}

          <!-- Footer -->
          <div class="text-center text-sm border-t pt-4">
            <p class="font-semibold">${t.thankYou}</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export const triggerIframePrint = (htmlContent) => {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.style.position = 'absolute'
    document.body.appendChild(iframe)

    iframe.contentDocument.write(htmlContent)
    iframe.contentDocument.close()

    iframe.contentWindow.onload = () => {
        setTimeout(() => {
            iframe.contentWindow.focus()
            iframe.contentWindow.print()
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe)
                }
            }, 2000)
        }, 250)
    }
}
