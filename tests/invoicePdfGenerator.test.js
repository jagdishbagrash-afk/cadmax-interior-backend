const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const invoicePdfGenerator = require('../src/Utill/invoicePdfGenerator');
const { resolveOrderInvoiceUrl } = require('../src/Controller/OrderController');

assert.equal(typeof resolveOrderInvoiceUrl, 'function');
assert.equal(resolveOrderInvoiceUrl({ invoiceUrl: 'https://example.com/invoice.pdf' }), 'https://example.com/invoice.pdf');
assert.equal(resolveOrderInvoiceUrl({ pdfUrl: 'https://example.com/invoice.pdf' }), 'https://example.com/invoice.pdf');

process.env.S3_BUCKET_NAME = 'demo-bucket';
process.env.AWS_REGION = 'ap-south-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

assert.equal(typeof invoicePdfGenerator.uploadInvoicePdfToCloud, 'function');

const localInvoiceDir = path.join(process.cwd(), 'uploads', 'invoices');
fs.mkdirSync(localInvoiceDir, { recursive: true });
fs.writeFileSync(path.join(localInvoiceDir, 'stale-invoice.pdf'), 'stale');

const order = {
    orderId: 'ORD-43763E9C',
    name: 'Test User',
    mobile: '9999999999',
    address: 'Test Address',
    product: [{ originalPrice: 100, quantity: 1, discount: 0 }],
    subtotal: 100,
    amount: 100,
    shippingAddress: {
        name: 'Test User',
        mobile: '9999999999',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        country: 'India',
    },
};

invoicePdfGenerator.generateOrderInvoicePdf(order).then((generatedPath) => {
    const files = fs.existsSync(localInvoiceDir) ? fs.readdirSync(localInvoiceDir) : [];
    assert.equal(files.length, 0, 'local uploads/invoices should stay empty when cloud S3 is enabled');
    assert.match(generatedPath, /cadmax-invoice-temp|Invoice-ORD-43763E9C/);
    console.log('invoicePdfGenerator cloud storage check passed');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
