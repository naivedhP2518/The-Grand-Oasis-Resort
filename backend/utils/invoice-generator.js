/**
 * Premium HTML Booking Invoice Generator
 * Produces high-end printable invoices for resort guests.
 */
export const generateInvoiceHTML = (booking, transaction) => {
    const today = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    const checkInDate = new Date(booking.checkIn).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

    const checkOutDate = new Date(booking.checkOut).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

    const totalDays = Math.max(
        1,
        Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))
    );

    const subtotal = booking.totalPrice;
    const taxes = Math.round(subtotal * 0.18); // 18% luxury resort GST
    const grandTotal = subtotal + taxes;
    const amountPaid = transaction.amount;
    const balanceDue = grandTotal - amountPaid;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice - The Grand Oasis Resort</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            background: #fff;
            margin: 0;
            padding: 40px;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #f1f5f9;
            padding: 40px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
            border-radius: 24px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 30px;
            margin-bottom: 30px;
        }
        .logo {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 28px;
            font-style: italic;
            font-weight: bold;
            color: #0f172a;
        }
        .logo span {
            color: #b45309; /* Gold accent */
        }
        .invoice-title {
            text-align: right;
        }
        .invoice-title h1 {
            margin: 0;
            font-size: 24px;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .invoice-title p {
            margin: 5px 0 0 0;
            color: #64748b;
            font-size: 14px;
        }
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        .details-block h3 {
            margin: 0 0 10px 0;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #b45309;
        }
        .details-block p {
            margin: 4px 0;
            font-size: 14px;
            line-height: 1.5;
            color: #334155;
        }
        .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge-success {
            background-color: #dcfce7;
            color: #15803d;
        }
        .badge-partial {
            background-color: #fef3c7;
            color: #d97706;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .table th {
            background: #f8fafc;
            color: #475569;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        .table td {
            padding: 15px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
            color: #334155;
        }
        .totals-table {
            width: 300px;
            margin-left: auto;
            margin-bottom: 40px;
        }
        .totals-table td {
            padding: 8px 15px;
            font-size: 14px;
        }
        .totals-table tr.grand-total td {
            font-weight: bold;
            font-size: 16px;
            color: #0f172a;
            border-top: 2px solid #e2e8f0;
            padding-top: 15px;
        }
        .footer {
            text-align: center;
            border-top: 1px solid #f1f5f9;
            padding-top: 30px;
            color: #94a3b8;
            font-size: 12px;
        }
        @media print {
            .no-print {
                display: none !important;
            }
            body {
                padding: 0;
            }
            .invoice-container {
                box-shadow: none;
                border: none;
                padding: 0;
            }
        }
    </style>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 600);
        };
    </script>
</head>
<body>
    <!-- Screen-Only Luxury Toolbar -->
    <div class="no-print" style="max-width: 800px; margin: 20px auto 20px auto; display: flex; justify-content: space-between; align-items: center; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0 10px;">
        <button onclick="window.close()" style="background: transparent; border: none; color: #64748b; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            &larr; Back to Resort
        </button>
        <button onclick="window.print()" style="background: #b45309; color: #fff; border: none; padding: 12px 24px; border-radius: 12px; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(180, 83, 9, 0.2);">
            📄 Download / Save PDF
        </button>
    </div>

    <div class="invoice-container">
        <div class="header">
            <div class="logo"><span>Grand</span> Oasis</div>
            <div class="invoice-title">
                <h1>Invoice</h1>
                <p>No: INV-${booking._id.toString().substring(0, 8).toUpperCase()}</p>
            </div>
        </div>

        <div class="details-grid">
            <div class="details-block">
                <h3>Resort Information</h3>
                <p><strong>The Grand Oasis Resort</strong></p>
                <p>Marine Drive Bypass, Sector 4</p>
                <p>Goa, India</p>
                <p>support@grandoasis.com</p>
            </div>
            <div class="details-block" style="text-align: right;">
                <h3>Guest Information</h3>
                <p><strong>Name:</strong> ${booking.guestName}</p>
                <p><strong>Email:</strong> ${booking.email}</p>
                <p><strong>Phone:</strong> ${booking.phone}</p>
                <p><strong>Invoice Date:</strong> ${today}</p>
            </div>
        </div>

        <div class="details-grid" style="background: #f8fafc; border-radius: 16px; padding: 20px; gap: 20px;">
            <div class="details-block" style="margin: 0;">
                <h3>Stay Details</h3>
                <p><strong>Villa Class:</strong> ${booking.villaName}</p>
                <p><strong>Check-In:</strong> ${checkInDate}</p>
                <p><strong>Check-Out:</strong> ${checkOutDate}</p>
                <p><strong>Duration:</strong> ${totalDays} Night(s)</p>
            </div>
            <div class="details-block" style="margin: 0; text-align: right;">
                <h3>Payment Verification</h3>
                <p><strong>Razorpay Order:</strong> ${transaction.razorpayOrderId}</p>
                <p><strong>Payment ID:</strong> ${transaction.razorpayPaymentId || "N/A"}</p>
                <p><strong>Clearance Status:</strong> 
                    <span class="badge ${balanceDue <= 0 ? "badge-success" : "badge-partial"}">
                        ${balanceDue <= 0 ? "Fully Paid" : "Advance Paid"}
                    </span>
                </p>
            </div>
        </div>

        <table class="table">
            <thead>
                <tr>
                    <th>Item Description</th>
                    <th>Rate</th>
                    <th>Nights</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Villa Stay Reservation (${booking.villaName})</td>
                    <td>₹${Math.round(booking.totalPrice / totalDays).toLocaleString()}</td>
                    <td>${totalDays}</td>
                    <td style="text-align: right;">₹${booking.totalPrice.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <table class="totals-table">
            <tr>
                <td style="color: #64748b;">Subtotal</td>
                <td style="text-align: right; font-weight: bold;">₹${subtotal.toLocaleString()}</td>
            </tr>
            <tr>
                <td style="color: #64748b;">GST & Luxury Tax (18%)</td>
                <td style="text-align: right; font-weight: bold;">₹${taxes.toLocaleString()}</td>
            </tr>
            <tr class="grand-total">
                <td>Grand Total</td>
                <td style="text-align: right;">₹${grandTotal.toLocaleString()}</td>
            </tr>
            <tr style="color: #16a34a; font-weight: bold;">
                <td>Amount Paid</td>
                <td style="text-align: right;">- ₹${amountPaid.toLocaleString()}</td>
            </tr>
            <tr style="border-top: 1px dashed #cbd5e1; font-weight: bold; color: ${balanceDue <= 0 ? "#64748b" : "#b45309"}">
                <td>Balance Due</td>
                <td style="text-align: right;">₹${balanceDue.toLocaleString()}</td>
            </tr>
        </table>

        <div class="footer">
            <p>Thank you for choosing to stay with us at The Grand Oasis.</p>
            <p style="font-size: 10px; margin-top: 10px;">This is a system-generated cryptographic invoice record under Transaction ID: ${transaction._id}.</p>
        </div>
    </div>
</body>
</html>
    `;
};
export default generateInvoiceHTML;
