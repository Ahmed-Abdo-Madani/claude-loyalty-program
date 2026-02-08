
export const downloadCSV = (data, filename) => {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

export const convertToCSV = (objArray) => {
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray
    let str = ''

    // Header row
    if (array.length > 0) {
        const headers = Object.keys(array[0])
        str += headers.join(',') + '\r\n'
    }

    // Data rows
    for (let i = 0; i < array.length; i++) {
        let line = ''
        for (let index in array[i]) {
            if (line !== '') line += ','

            // Handle values that might contain commas or newlines
            let value = array[i][index]
            if (typeof value === 'string') {
                if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                    value = `"${value.replace(/"/g, '""')}"`
                }
            }

            line += value
        }
        str += line + '\r\n'
    }

    return str
}
