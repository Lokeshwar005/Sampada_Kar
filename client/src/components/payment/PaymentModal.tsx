import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  CreditCard,
  QrCode,
  Building,
  CheckCircle,
  ShieldCheck,
  ArrowRight,
  FileText,
  Star,
  Sparkles,
} from 'lucide-react';
import { Property } from '../../types/index.js';
import { api } from '../../services/api.js';
import { TaxBreakdownCard } from '../tax/TaxBreakdownCard.js';
import { Link } from 'react-router-dom';

interface PaymentModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (receiptNumber: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  property,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD' | 'NET_BANKING' | 'MOCK'>('UPI');
  const [upiId, setUpiId] = useState('citizen@okaxis');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePay = async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // 1. Create order
      const orderRes = await api.post('/payments/create-order', {
        propertyId: property.id,
        forceMock: selectedMethod === 'MOCK',
      });

      const orderData = orderRes.data;

      // 2. If Razorpay client configured on frontend & order mode is RAZORPAY
      if (orderData.mode === 'RAZORPAY' && (window as any).Razorpay) {
        const options = {
          key: orderData.key,
          amount: orderData.amount * 100,
          currency: 'INR',
          name: 'Sampada Kar Municipal Portal',
          description: `Property Tax Assessment FY 2026-27 (${property.propertyId})`,
          order_id: orderData.orderId,
          handler: async function (response: any) {
            const verifyRes = await api.post('/payments/verify', {
              propertyId: property.id,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              paymentMode: `RAZORPAY_${selectedMethod}`,
              isMock: false,
            });

            handleSuccess(verifyRes.data.receiptNumber);
          },
          prefill: {
            name: property.owner?.fullName || 'Citizen Taxpayer',
            email: property.owner?.email || 'citizen@sampadakar.in',
            contact: property.owner?.mobile || '9876543210',
          },
          theme: { color: '#1d4ed8' },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        setIsProcessing(false);
        return;
      }

      // 3. Fallback: Municipal Test Gateway Simulator / Mock Flow
      const verifyRes = await api.post('/payments/verify', {
        propertyId: property.id,
        orderId: orderData.orderId,
        paymentId: `TXN-SIM-${Date.now()}`,
        paymentMode: `ONLINE_${selectedMethod}`,
        isMock: true,
      });

      if (verifyRes.data.success) {
        handleSuccess(verifyRes.data.receiptNumber);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Payment processing failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleSuccess = (receiptNo: string) => {
    setIsProcessing(false);
    setSuccessReceipt(receiptNo);
    onPaymentSuccess(receiptNo);

    // Fire Confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // Confetti fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">Secure Municipal Tax Payment</h3>
              <p className="text-xs text-slate-400">
                Property: {property.propertyId} ({property.wardNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
          {successReceipt ? (
            /* Success State */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Payment Completed Successfully!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Municipal tax for FY 2026-2027 has been settled in municipal accounts.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center max-w-xs mx-auto">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Official Receipt Number
                </span>
                <span className="text-xl font-mono font-bold text-blue-700 dark:text-blue-400">
                  {successReceipt}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  to={`/receipt/${successReceipt}`}
                  target="_blank"
                  className="w-full sm:w-auto px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
                >
                  <FileText className="w-4 h-4" /> View & Print Official Receipt
                </Link>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Payment Input State */
            <>
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Summary Breakdown */}
              {property.taxBreakdown && (
                <TaxBreakdownCard breakdown={property.taxBreakdown} compact />
              )}

              {/* Payment Methods */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Select Payment Method
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('UPI')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      selectedMethod === 'UPI'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-bold ring-2 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-blue-600" />
                    <span className="text-xs">UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('CARD')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      selectedMethod === 'CARD'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-bold ring-2 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <span className="text-xs">Cards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('NET_BANKING')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      selectedMethod === 'NET_BANKING'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-bold ring-2 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Building className="w-5 h-5 text-blue-600" />
                    <span className="text-xs">Net Banking</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('MOCK')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      selectedMethod === 'MOCK'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-bold ring-2 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span className="text-xs">Simulator</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Sub-Form */}
              {selectedMethod === 'UPI' && (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Enter Virtual Payment Address (VPA / UPI ID)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. yourname@okhdfcbank"
                    className="w-full text-xs px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <p className="text-[11px] text-slate-400">
                    Supports Google Pay, PhonePe, Paytm, BHIM UPI.
                  </p>
                </div>
              )}

              {selectedMethod === 'CARD' && (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Direct Credit / Debit Card Gateway
                  </p>
                  <p className="text-[11px]">
                    Accepts RuPay, Visa, MasterCard, and Maestro with 3D Secure OTP verification.
                  </p>
                </div>
              )}

              {selectedMethod === 'NET_BANKING' && (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Major Indian Banks Supported
                  </p>
                  <p className="text-[11px]">
                    State Bank of India, Punjab National Bank, HDFC, ICICI, Bank of Baroda, Axis Bank.
                  </p>
                </div>
              )}

              {selectedMethod === 'MOCK' && (
                <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">Municipal Test Gateway Simulator Active</p>
                  <p className="text-[11px]">
                    Allows instant end-to-end evaluation and receipt issuance without entering real card/UPI details.
                  </p>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Securing Transaction...
                  </span>
                ) : (
                  <>
                    Pay ₹{property.taxBreakdown?.totalPayable.toLocaleString('en-IN')}{' '}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
