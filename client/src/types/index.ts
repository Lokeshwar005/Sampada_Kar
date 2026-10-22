export type UserRole = 'CITIZEN' | 'WARD_OFFICER' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: UserRole;
  isSeniorCitizen: boolean;
  isBlocked?: boolean;
  assignedWards: string[];
}

export type PropertyType =
  | 'RESIDENTIAL'
  | 'COMMERCIAL'
  | 'INDUSTRIAL'
  | 'INSTITUTIONAL'
  | 'AGRICULTURAL';

export interface TaxBreakdown {
  ratePerSqFt: number;
  builtUpAreaSqFt: number;
  baseTax: number;
  propertyAgeYears: number;
  ageBandLabel: string;
  ageDiscountPercent: number;
  ageDiscountAmount: number;
  netTax: number;
  isExempt: boolean;
  exemptionReason?: string | null;
  isEarlyBirdEligible: boolean;
  earlyBirdRebatePercent: number;
  earlyRebateAmount: number;
  isSeniorCitizenEligible: boolean;
  seniorCitizenRebatePercent: number;
  seniorRebateAmount: number;
  monthsLate: number;
  latePenaltyPercent: number;
  latePenaltyAmount: number;
  arrearsAmount: number;
  arrearsPenaltyAmount: number;
  totalPayable: number;
  calculationDate: string;
}

export interface Property {
  id: string;
  propertyId: string;
  ownerId: string;
  wardNumber: string;
  address: string;
  propertyType: PropertyType;
  builtUpAreaSqFt: number;
  constructionYear: number;
  isExempt: boolean;
  exemptionReason?: string | null;
  assessmentYear: number;
  status: 'ACTIVE' | 'PENDING_TRANSFER' | 'PENDING_REASSESSMENT';
  hasArrears: boolean;
  arrearsAmount: number;
  arrearsYears?: string | null;
  isPaid?: boolean;
  latestPayment?: Payment | null;
  taxBreakdown?: TaxBreakdown;
  owner?: {
    id: string;
    fullName: string;
    email: string;
    mobile: string;
    isSeniorCitizen: boolean;
  };
  ownershipHistory?: OwnershipHistory[];
  payments?: Payment[];
  instalments?: PaymentInstalment[];
}

export interface OwnershipHistory {
  id: string;
  propertyId: string;
  ownerName: string;
  ownerMobile: string;
  ownershipType: string;
  startDate: string;
  endDate?: string | null;
  documentRef?: string | null;
  transferReason?: string | null;
}

export interface TaxSetting {
  id: string;
  financialYear: string;
  residentialRate: number;
  commercialRate: number;
  industrialRate: number;
  institutionalRate: number;
  agriculturalRate: number;
  ageBand0to5: number;
  ageBand6to15: number;
  ageBand16to30: number;
  ageBandAbove30: number;
  earlyBirdRebatePercent: number;
  seniorCitizenRebatePercent: number;
  latePaymentPenaltyMonthlyPercent: number;
  maxPenaltyPercentCap: number;
  arrearPenaltyPercent: number;
  dueDate: string;
  earlyBirdCutoffDate: string;
  isActive: boolean;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  propertyId: string;
  payerId: string;
  financialYear: string;
  assessmentYear: number;
  baseTax: number;
  ageDiscountAmount: number;
  netTax: number;
  earlyRebateAmount: number;
  seniorRebateAmount: number;
  latePenaltyAmount: number;
  arrearsAmount: number;
  arrearsPenaltyAmount: number;
  totalAmount: number;
  paymentMode: string;
  transactionId: string;
  status: string;
  isInstalment: boolean;
  instalmentPlan?: number | null;
  amountInWords: string;
  paidAt: string;
  property?: Property;
  payer?: {
    id: string;
    fullName: string;
    mobile: string;
    email: string;
  };
}

export interface PaymentInstalment {
  id: string;
  paymentId?: string | null;
  propertyId: string;
  payerId: string;
  financialYear: string;
  partNumber: number;
  totalParts: number;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  receiptNumber?: string | null;
  paidAt?: string | null;
}

export interface DemandNotice {
  id: string;
  noticeNumber: string;
  propertyId: string;
  recipientId: string;
  issuedByOfficerId: string;
  financialYear: string;
  assessmentYear: number;
  unpaidTax: number;
  accruedPenalty: number;
  arrears: number;
  totalDue: number;
  issueDate: string;
  deadlineDate: string;
  status: 'ISSUED' | 'PAID' | 'SERVED';
  property?: Property;
  recipient?: {
    fullName: string;
    mobile: string;
    email: string;
  };
  officer?: {
    fullName: string;
  };
}

export interface Grievance {
  id: string;
  ticketNumber: string;
  citizenId: string;
  propertyId?: string | null;
  wardNumber: string;
  category: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  assignedOfficerId?: string | null;
  officerRemarks?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  citizen?: {
    fullName: string;
    mobile: string;
    email: string;
  };
  officer?: {
    fullName: string;
  };
  property?: {
    propertyId: string;
    address: string;
  };
}

export interface TransferRequest {
  id: string;
  applicationNumber: string;
  propertyId: string;
  currentOwnerId: string;
  newOwnerName: string;
  newOwnerMobile: string;
  newOwnerEmail?: string | null;
  transferType: 'SALE' | 'GIFT' | 'INHERITANCE';
  deedNumber: string;
  deedDate: string;
  supportingDocRef?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  createdAt: string;
  property?: Property;
  currentOwner?: {
    fullName: string;
    mobile: string;
    email: string;
  };
  officer?: {
    fullName: string;
  };
}

export interface ReassessmentRequest {
  id: string;
  applicationNumber: string;
  propertyId: string;
  citizenId: string;
  existingArea: number;
  proposedArea: number;
  existingType: string;
  proposedType: string;
  reason: string;
  existingEstimatedTax: number;
  proposedEstimatedTax: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  createdAt: string;
  property?: Property;
  citizen?: {
    fullName: string;
    mobile: string;
  };
  officer?: {
    fullName: string;
  };
}

export interface NotificationItem {
  id: string;
  recipientUserId?: string | null;
  targetRole?: string | null;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details: string;
  ipAddress?: string | null;
  timestamp: string;
}
