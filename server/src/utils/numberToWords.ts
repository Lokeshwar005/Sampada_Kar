/**
 * Converts a numeric amount to Indian currency words
 * e.g., 9120 -> "Rupees Nine Thousand One Hundred Twenty Only"
 * e.g., 9792 -> "Rupees Nine Thousand Seven Hundred Ninety Two Only"
 */
export function amountToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const singleDigits = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(num: number): string {
    if (num < 20) return singleDigits[num];
    const ten = Math.floor(num / 10);
    const rem = num % 10;
    return `${tens[ten]}${rem > 0 ? ' ' + singleDigits[rem] : ''}`.trim();
  }

  function convertThreeDigits(num: number): string {
    const hundred = Math.floor(num / 100);
    const rem = num % 100;
    let str = '';
    if (hundred > 0) {
      str += `${singleDigits[hundred]} Hundred`;
    }
    if (rem > 0) {
      str += `${hundred > 0 ? ' ' : ''}${convertTwoDigits(rem)}`;
    }
    return str.trim();
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Rupees Zero Only';

  let remaining = rupees;

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  const hundredAndBelow = remaining;

  let result = '';

  if (crore > 0) {
    result += `${convertTwoDigits(crore)} Crore `;
  }
  if (lakh > 0) {
    result += `${convertTwoDigits(lakh)} Lakh `;
  }
  if (thousand > 0) {
    result += `${convertTwoDigits(thousand)} Thousand `;
  }
  if (hundredAndBelow > 0) {
    result += `${convertThreeDigits(hundredAndBelow)} `;
  }

  result = result.trim();
  let finalStr = `Rupees ${result}`;

  if (paise > 0) {
    finalStr += ` and ${convertTwoDigits(paise)} Paise`;
  }

  finalStr += ' Only';
  return isNegative ? `Minus ${finalStr}` : finalStr;
}
