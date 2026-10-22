import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculatePropertyTax } from '../src/tax/taxEngine.js';
import { amountToIndianWords } from '../src/utils/numberToWords.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Sampada Kar...');

  // Clean existing data
  await prisma.feedback.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.demandNotice.deleteMany();
  await prisma.reassessmentRequest.deleteMany();
  await prisma.transferRequest.deleteMany();
  await prisma.grievance.deleteMany();
  await prisma.paymentInstalment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ownershipHistory.deleteMany();
  await prisma.wardOfficerAssignment.deleteMany();
  await prisma.property.deleteMany();
  await prisma.taxSetting.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Tax Settings (2022-2027 archive)
  console.log('Creating Tax Settings Archive...');
  await prisma.taxSetting.createMany({
    data: [
      {
        financialYear: '2022-2023',
        residentialRate: 6.0,
        commercialRate: 12.0,
        industrialRate: 14.0,
        institutionalRate: 8.0,
        agriculturalRate: 2.0,
        ageBand0to5: 0.0,
        ageBand6to15: 10.0,
        ageBand16to30: 20.0,
        ageBandAbove30: 30.0,
        earlyBirdRebatePercent: 5.0,
        seniorCitizenRebatePercent: 10.0,
        latePaymentPenaltyMonthlyPercent: 2.0,
        maxPenaltyPercentCap: 24.0,
        arrearPenaltyPercent: 18.0,
        dueDate: new Date('2022-12-31T23:59:59Z'),
        earlyBirdCutoffDate: new Date('2022-05-31T23:59:59Z'),
        isActive: false,
      },
      {
        financialYear: '2023-2024',
        residentialRate: 6.5,
        commercialRate: 13.0,
        industrialRate: 15.0,
        institutionalRate: 8.5,
        agriculturalRate: 2.5,
        ageBand0to5: 0.0,
        ageBand6to15: 10.0,
        ageBand16to30: 20.0,
        ageBandAbove30: 30.0,
        earlyBirdRebatePercent: 5.0,
        seniorCitizenRebatePercent: 10.0,
        latePaymentPenaltyMonthlyPercent: 2.0,
        maxPenaltyPercentCap: 24.0,
        arrearPenaltyPercent: 18.0,
        dueDate: new Date('2023-12-31T23:59:59Z'),
        earlyBirdCutoffDate: new Date('2023-05-31T23:59:59Z'),
        isActive: false,
      },
      {
        financialYear: '2024-2025',
        residentialRate: 7.0,
        commercialRate: 14.0,
        industrialRate: 16.0,
        institutionalRate: 9.0,
        agriculturalRate: 2.5,
        ageBand0to5: 0.0,
        ageBand6to15: 10.0,
        ageBand16to30: 20.0,
        ageBandAbove30: 30.0,
        earlyBirdRebatePercent: 5.0,
        seniorCitizenRebatePercent: 10.0,
        latePaymentPenaltyMonthlyPercent: 2.0,
        maxPenaltyPercentCap: 24.0,
        arrearPenaltyPercent: 18.0,
        dueDate: new Date('2024-12-31T23:59:59Z'),
        earlyBirdCutoffDate: new Date('2024-05-31T23:59:59Z'),
        isActive: false,
      },
      {
        financialYear: '2025-2026',
        residentialRate: 7.5,
        commercialRate: 14.5,
        industrialRate: 17.0,
        institutionalRate: 9.5,
        agriculturalRate: 3.0,
        ageBand0to5: 0.0,
        ageBand6to15: 10.0,
        ageBand16to30: 20.0,
        ageBandAbove30: 30.0,
        earlyBirdRebatePercent: 5.0,
        seniorCitizenRebatePercent: 10.0,
        latePaymentPenaltyMonthlyPercent: 2.0,
        maxPenaltyPercentCap: 24.0,
        arrearPenaltyPercent: 18.0,
        dueDate: new Date('2025-12-31T23:59:59Z'),
        earlyBirdCutoffDate: new Date('2025-05-31T23:59:59Z'),
        isActive: false,
      },
      {
        financialYear: '2026-2027',
        residentialRate: 8.0,
        commercialRate: 15.0,
        industrialRate: 18.0,
        institutionalRate: 10.0,
        agriculturalRate: 3.0,
        ageBand0to5: 0.0,
        ageBand6to15: 10.0,
        ageBand16to30: 20.0,
        ageBandAbove30: 30.0,
        earlyBirdRebatePercent: 5.0,
        seniorCitizenRebatePercent: 10.0,
        latePaymentPenaltyMonthlyPercent: 2.0,
        maxPenaltyPercentCap: 24.0,
        arrearPenaltyPercent: 18.0,
        dueDate: new Date('2026-12-31T23:59:59Z'),
        earlyBirdCutoffDate: new Date('2026-11-30T23:59:59Z'), // In window currently
        isActive: true,
      },
    ],
  });

  const activeTaxSetting = await prisma.taxSetting.findUniqueOrThrow({
    where: { financialYear: '2026-2027' },
  });

  // 2. Create Users
  console.log('Creating Users...');
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('AdminPassword@123', salt);
  const officerPassword = await bcrypt.hash('OfficerPassword@123', salt);
  const citizenPassword = await bcrypt.hash('CitizenPassword@123', salt);

  const admin = await prisma.user.create({
    data: {
      fullName: 'Shri Vikramaditya Joshi (Municipal Commissioner)',
      email: 'admin@sampadakar.gov.in',
      mobile: '9876543210',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isSeniorCitizen: false,
    },
  });

  const officer1 = await prisma.user.create({
    data: {
      fullName: 'Sunil Sharma (Ward Revenue Officer W-01/02)',
      email: 'officer.sharma@sampadakar.gov.in',
      mobile: '9876543211',
      passwordHash: officerPassword,
      role: 'WARD_OFFICER',
      isSeniorCitizen: false,
    },
  });

  // Assign W-01 and W-02 to Officer 1
  await prisma.wardOfficerAssignment.createMany({
    data: [
      { officerId: officer1.id, wardNumber: 'W-01' },
      { officerId: officer1.id, wardNumber: 'W-02' },
    ],
  });

  const officer2 = await prisma.user.create({
    data: {
      fullName: 'Pooja Patel (Ward Revenue Officer W-03/04)',
      email: 'officer.patel@sampadakar.gov.in',
      mobile: '9876543212',
      passwordHash: officerPassword,
      role: 'WARD_OFFICER',
      isSeniorCitizen: false,
    },
  });

  await prisma.wardOfficerAssignment.createMany({
    data: [
      { officerId: officer2.id, wardNumber: 'W-03' },
      { officerId: officer2.id, wardNumber: 'W-04' },
    ],
  });

  const citizenRajesh = await prisma.user.create({
    data: {
      fullName: 'Rajesh Kumar Verma',
      email: 'citizen.rajesh@gmail.com',
      mobile: '9876543213',
      passwordHash: citizenPassword,
      role: 'CITIZEN',
      isSeniorCitizen: false,
    },
  });

  const citizenSenior = await prisma.user.create({
    data: {
      fullName: 'Shrimati Saraswati Devi',
      email: 'senior.shrimati@gmail.com',
      mobile: '9876543214',
      passwordHash: citizenPassword,
      role: 'CITIZEN',
      isSeniorCitizen: true, // Senior Citizen
    },
  });

  const citizenVikram = await prisma.user.create({
    data: {
      fullName: 'Vikram Enterprise Ltd (Director Amit Jain)',
      email: 'vikram.enterprises@gmail.com',
      mobile: '9876543215',
      passwordHash: citizenPassword,
      role: 'CITIZEN',
      isSeniorCitizen: false,
    },
  });

  const citizenAnanya = await prisma.user.create({
    data: {
      fullName: 'Ananya Mukherjee',
      email: 'ananya.m@gmail.com',
      mobile: '9876543216',
      passwordHash: citizenPassword,
      role: 'CITIZEN',
      isSeniorCitizen: false,
    },
  });

  // 3. Properties (~20 properties across W-01 to W-05)
  console.log('Creating ~20 Properties with ownership history...');

  const propertiesData = [
    // 1. Rajesh Verma's worked example property
    {
      propertyId: 'PROP-W01-1001',
      ownerId: citizenRajesh.id,
      wardNumber: 'W-01',
      address: 'Plot 42, Shanti Nagar, Sector 4, Ward 01',
      propertyType: 'RESIDENTIAL',
      builtUpAreaSqFt: 1500,
      constructionYear: 2006, // Age 20 -> 20% age discount
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 2. Senior Citizen Saraswati Devi's home
    {
      propertyId: 'PROP-W01-1002',
      ownerId: citizenSenior.id,
      wardNumber: 'W-01',
      address: 'Bungalow 7, Vasant Vihar, Main Road, Ward 01',
      propertyType: 'RESIDENTIAL',
      builtUpAreaSqFt: 1200,
      constructionYear: 1998, // Age 28 -> 20% discount
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 3. Exempt Temple (Place of Worship)
    {
      propertyId: 'PROP-W01-TEMPLE',
      ownerId: admin.id,
      wardNumber: 'W-01',
      address: 'Shri Ram Mandir Parisar, Temple Street, Ward 01',
      propertyType: 'INSTITUTIONAL',
      builtUpAreaSqFt: 4500,
      constructionYear: 1985,
      isExempt: true,
      exemptionReason: 'Place of Public Worship and Heritage Site',
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 4. Defaulter 1 in W-01 (Residential Arrears)
    {
      propertyId: 'PROP-W01-DEF01',
      ownerId: citizenRajesh.id,
      wardNumber: 'W-01',
      address: 'Flat 302, Gokul Enclave, Shivaji Marg, Ward 01',
      propertyType: 'RESIDENTIAL',
      builtUpAreaSqFt: 1800,
      constructionYear: 2012,
      isExempt: false,
      hasArrears: true,
      arrearsAmount: 18500.0,
      arrearsYears: '2024-2025',
      status: 'ACTIVE',
    },
    // 5. Exempt School in W-02
    {
      propertyId: 'PROP-W02-SCHOOL',
      ownerId: admin.id,
      wardNumber: 'W-02',
      address: 'Adarsh Municipal Higher Secondary School, Ward 02',
      propertyType: 'INSTITUTIONAL',
      builtUpAreaSqFt: 8500,
      constructionYear: 1995,
      isExempt: true,
      exemptionReason: 'Municipal Government Educational Institution',
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 6. Defaulter 2 in W-02 (Commercial Arrears)
    {
      propertyId: 'PROP-W02-DEF02',
      ownerId: citizenVikram.id,
      wardNumber: 'W-02',
      address: 'Shop 14-16, City Center Commercial Plaza, Ward 02',
      propertyType: 'COMMERCIAL',
      builtUpAreaSqFt: 2200,
      constructionYear: 2010,
      isExempt: false,
      hasArrears: true,
      arrearsAmount: 24200.0,
      arrearsYears: '2023-2025',
      status: 'ACTIVE',
    },
    // 7. Commercial Plaza in W-01
    {
      propertyId: 'PROP-W01-1007',
      ownerId: citizenVikram.id,
      wardNumber: 'W-01',
      address: 'Ground Floor Showroom, MG Road, Ward 01',
      propertyType: 'COMMERCIAL',
      builtUpAreaSqFt: 3000,
      constructionYear: 2018,
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 8. Industrial Unit in W-02
    {
      propertyId: 'PROP-W02-1008',
      ownerId: citizenVikram.id,
      wardNumber: 'W-02',
      address: 'Plot 101, Industrial Area Phase 1, Ward 02',
      propertyType: 'INDUSTRIAL',
      builtUpAreaSqFt: 5000,
      constructionYear: 2015,
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 9. Defaulter 3 in W-03 (Commercial)
    {
      propertyId: 'PROP-W03-DEF03',
      ownerId: citizenAnanya.id,
      wardNumber: 'W-03',
      address: 'Complex B-4, Commercial Hub, Sector 9, Ward 03',
      propertyType: 'COMMERCIAL',
      builtUpAreaSqFt: 1600,
      constructionYear: 2008,
      isExempt: false,
      hasArrears: true,
      arrearsAmount: 14000.0,
      arrearsYears: '2024-2025',
      status: 'ACTIVE',
    },
    // 10. Defaulter 4 in W-04 (Industrial)
    {
      propertyId: 'PROP-W04-DEF04',
      ownerId: citizenVikram.id,
      wardNumber: 'W-04',
      address: 'Shed 22, Heavy Engineering Zone, Ward 04',
      propertyType: 'INDUSTRIAL',
      builtUpAreaSqFt: 6200,
      constructionYear: 2004,
      isExempt: false,
      hasArrears: true,
      arrearsAmount: 32000.0,
      arrearsYears: '2023-2025',
      status: 'ACTIVE',
    },
    // 11. Ananya Residential W-03
    {
      propertyId: 'PROP-W03-1011',
      ownerId: citizenAnanya.id,
      wardNumber: 'W-03',
      address: 'House 18, Green Meadows, Ward 03',
      propertyType: 'RESIDENTIAL',
      builtUpAreaSqFt: 1400,
      constructionYear: 2021,
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 12. Agricultural Green Belt W-04
    {
      propertyId: 'PROP-W04-1012',
      ownerId: citizenRajesh.id,
      wardNumber: 'W-04',
      address: 'Survey No. 89/2, Municipal Outskirts Greenbelt, Ward 04',
      propertyType: 'AGRICULTURAL',
      builtUpAreaSqFt: 10000,
      constructionYear: 2010,
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 13. Saraswati Devi Second Property W-02
    {
      propertyId: 'PROP-W02-1013',
      ownerId: citizenSenior.id,
      wardNumber: 'W-02',
      address: 'Apartment 404, Anand Dham, Ward 02',
      propertyType: 'RESIDENTIAL',
      builtUpAreaSqFt: 950,
      constructionYear: 2023,
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 14. Residential Villa W-01
    {
      propertyId: 'PROP-W01-1014',
      ownerId: citizenAnanya.id,
      wardNumber: 'W-01',
      address: 'Villa 12, Gulmohar Enclave, Ward 01',
      propertyType: 'RESIDENTIAL',
      builtUpAreaSqFt: 2100,
      constructionYear: 2019,
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 15. Commercial Office W-02
    {
      propertyId: 'PROP-W02-1015',
      ownerId: citizenVikram.id,
      wardNumber: 'W-02',
      address: 'Suite 501, IT Park Tower A, Ward 02',
      propertyType: 'COMMERCIAL',
      builtUpAreaSqFt: 2800,
      constructionYear: 2022,
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 16. Institutional Hospital W-03
    {
      propertyId: 'PROP-W03-1016',
      ownerId: admin.id,
      wardNumber: 'W-03',
      address: 'Municipal Civil Dispensary & Maternity Care, Ward 03',
      propertyType: 'INSTITUTIONAL',
      builtUpAreaSqFt: 4000,
      constructionYear: 2000,
      isExempt: true,
      exemptionReason: 'Government Public Health Center',
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 17. Residential W-04
    {
      propertyId: 'PROP-W04-1017',
      ownerId: citizenRajesh.id,
      wardNumber: 'W-04',
      address: 'Row House 5, Surya Nagar, Ward 04',
      propertyType: 'RESIDENTIAL',
      builtUpAreaSqFt: 1350,
      constructionYear: 2016,
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 18. Commercial Warehousing W-04
    {
      propertyId: 'PROP-W04-1018',
      ownerId: citizenVikram.id,
      wardNumber: 'W-04',
      address: 'Logistics Hub Unit 9, Outer Ring Road, Ward 04',
      propertyType: 'COMMERCIAL',
      builtUpAreaSqFt: 4200,
      constructionYear: 2017,
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 19. Residential W-05
    {
      propertyId: 'PROP-W05-1019',
      ownerId: citizenAnanya.id,
      wardNumber: 'W-05',
      address: 'Flat 101, Lakeview Residency, Ward 05',
      propertyType: 'RESIDENTIAL',
      builtUpAreaSqFt: 1100,
      constructionYear: 2020,
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
    // 20. Industrial Unit W-05
    {
      propertyId: 'PROP-W05-1020',
      ownerId: citizenVikram.id,
      wardNumber: 'W-05',
      address: 'Plot 77, Small Scale Industries Complex, Ward 05',
      propertyType: 'INDUSTRIAL',
      builtUpAreaSqFt: 3800,
      constructionYear: 2011,
      isExempt: false,
      hasArrears: false,
      status: 'ACTIVE',
    },
  ];

  const createdProperties = [];
  for (const p of propertiesData) {
    const created = await prisma.property.create({
      data: p,
      include: { owner: true },
    });
    createdProperties.push(created);

    // Create Initial Ownership History Row
    await prisma.ownershipHistory.create({
      data: {
        propertyId: created.id,
        ownerName: created.owner.fullName,
        ownerMobile: created.owner.mobile,
        ownershipType: 'PURCHASE',
        startDate: new Date('2020-01-01T00:00:00Z'),
        documentRef: `REG-${created.propertyId}-2020`,
        transferReason: 'Initial Registry Allotment',
      },
    });
  }

  // 4. Create Sample Completed Payments & Unique Receipts
  console.log('Creating Sample Payments with receipts...');
  const prop1 = createdProperties.find((p) => p.propertyId === 'PROP-W01-1001')!;
  const taxProp1 = calculatePropertyTax(
    prop1,
    prop1.owner,
    activeTaxSetting,
    { forceEarlyRebate: true }
  );

  const payment1 = await prisma.payment.create({
    data: {
      receiptNumber: 'ST-2026-0001',
      propertyId: prop1.id,
      payerId: prop1.ownerId,
      financialYear: '2026-2027',
      assessmentYear: 2026,
      baseTax: taxProp1.baseTax,
      ageDiscountAmount: taxProp1.ageDiscountAmount,
      netTax: taxProp1.netTax,
      earlyRebateAmount: taxProp1.earlyRebateAmount,
      seniorRebateAmount: taxProp1.seniorRebateAmount,
      latePenaltyAmount: 0,
      arrearsAmount: 0,
      arrearsPenaltyAmount: 0,
      totalAmount: taxProp1.totalPayable,
      paymentMode: 'RAZORPAY_UPI',
      transactionId: 'TXN-RAZORPAY-20260101',
      orderId: 'order_sampada_001',
      status: 'SUCCESS',
      isInstalment: false,
      amountInWords: amountToIndianWords(taxProp1.totalPayable),
      paidAt: new Date(),
    },
  });

  // Second payment for Senior Citizen Property
  const propSenior = createdProperties.find((p) => p.propertyId === 'PROP-W01-1002')!;
  const taxSenior = calculatePropertyTax(
    propSenior,
    propSenior.owner,
    activeTaxSetting,
    { forceEarlyRebate: true }
  );

  await prisma.payment.create({
    data: {
      receiptNumber: 'ST-2026-0002',
      propertyId: propSenior.id,
      payerId: propSenior.ownerId,
      financialYear: '2026-2027',
      assessmentYear: 2026,
      baseTax: taxSenior.baseTax,
      ageDiscountAmount: taxSenior.ageDiscountAmount,
      netTax: taxSenior.netTax,
      earlyRebateAmount: taxSenior.earlyRebateAmount,
      seniorRebateAmount: taxSenior.seniorRebateAmount,
      latePenaltyAmount: 0,
      arrearsAmount: 0,
      arrearsPenaltyAmount: 0,
      totalAmount: taxSenior.totalPayable,
      paymentMode: 'MOCK_GATEWAY',
      transactionId: 'TXN-MOCK-20260102',
      status: 'SUCCESS',
      isInstalment: false,
      amountInWords: amountToIndianWords(taxSenior.totalPayable),
      paidAt: new Date(),
    },
  });

  // 5. Create Demand Notice with 15-day deadline for Defaulter 1
  console.log('Creating Demand Notice for defaulter...');
  const def1 = createdProperties.find((p) => p.propertyId === 'PROP-W01-DEF01')!;
  const today = new Date();
  const deadline = new Date(today);
  deadline.setDate(deadline.getDate() + 15); // Exactly 15 days deadline

  await prisma.demandNotice.create({
    data: {
      noticeNumber: 'DN-2026-0001',
      propertyId: def1.id,
      recipientId: def1.ownerId,
      issuedByOfficerId: officer1.id,
      financialYear: '2026-2027',
      assessmentYear: 2026,
      unpaidTax: 11520.0,
      accruedPenalty: 1850.0,
      arrears: def1.arrearsAmount,
      totalDue: 11520.0 + 1850.0 + def1.arrearsAmount,
      issueDate: today,
      deadlineDate: deadline,
      status: 'ISSUED',
    },
  });

  // 6. Create Grievances (Open, In Progress, Resolved)
  console.log('Creating Grievances...');
  await prisma.grievance.create({
    data: {
      ticketNumber: 'GRV-2026-0001',
      citizenId: citizenRajesh.id,
      propertyId: prop1.id,
      wardNumber: 'W-01',
      category: 'INCORRECT_MEASUREMENT',
      subject: 'Discrepancy in recorded built-up area after balcony renovation',
      description: 'The property register lists 1,500 sq ft, but physical measurement is 1,420 sq ft. Requesting official remeasuring.',
      status: 'IN_PROGRESS',
      assignedOfficerId: officer1.id,
      officerRemarks: 'Site verification scheduled for upcoming Friday 11:00 AM.',
    },
  });

  await prisma.grievance.create({
    data: {
      ticketNumber: 'GRV-2026-0002',
      citizenId: citizenSenior.id,
      propertyId: propSenior.id,
      wardNumber: 'W-01',
      category: 'BILLING_ISSUE',
      subject: 'Senior citizen rebate verification confirmation',
      description: 'Submitted Aadhaar card copy for senior citizen rebate verification.',
      status: 'RESOLVED',
      assignedOfficerId: officer1.id,
      officerRemarks: 'Aadhaar age verified. Senior citizen 10% rebate applied successfully.',
      resolvedAt: new Date(),
    },
  });

  await prisma.grievance.create({
    data: {
      ticketNumber: 'GRV-2026-0003',
      citizenId: citizenAnanya.id,
      propertyId: createdProperties.find((p) => p.propertyId === 'PROP-W03-1011')!.id,
      wardNumber: 'W-03',
      category: 'NAME_CORRECTION',
      subject: 'Spelling correction in owner name',
      description: 'My name is misspelled as Ananya Mukherji instead of Ananya Mukherjee.',
      status: 'OPEN',
      assignedOfficerId: officer2.id,
    },
  });

  // 7. Create Sample Transfer Request
  console.log('Creating Transfer Request...');
  const transferProp = createdProperties.find((p) => p.propertyId === 'PROP-W01-1014')!;
  await prisma.transferRequest.create({
    data: {
      applicationNumber: 'TRF-2026-0001',
      propertyId: transferProp.id,
      currentOwnerId: citizenAnanya.id,
      newOwnerName: 'Deepak Subhash Chawla',
      newOwnerMobile: '9822334455',
      newOwnerEmail: 'deepak.chawla@gmail.com',
      transferType: 'SALE',
      deedNumber: 'DEED-SALE-7892/2026',
      deedDate: new Date('2026-09-15T00:00:00Z'),
      status: 'PENDING',
    },
  });

  // 8. Create Sample Reassessment Request
  console.log('Creating Reassessment Request...');
  await prisma.reassessmentRequest.create({
    data: {
      applicationNumber: 'REA-2026-0001',
      propertyId: prop1.id,
      citizenId: citizenRajesh.id,
      existingArea: 1500,
      proposedArea: 1850,
      existingType: 'RESIDENTIAL',
      proposedType: 'RESIDENTIAL',
      reason: 'Constructed additional second floor room of 350 sq ft with municipal sanction permit #SANC-2025-88.',
      existingEstimatedTax: 9120,
      proposedEstimatedTax: 11248,
      status: 'PENDING',
    },
  });

  // 9. Feedback tied to completed payment
  console.log('Creating Feedback...');
  await prisma.feedback.create({
    data: {
      userId: citizenRajesh.id,
      referenceType: 'PAYMENT',
      referenceId: payment1.receiptNumber,
      rating: 5,
      comments: 'Seamless online UPI payment experience. Instant receipt download with breakdown!',
    },
  });

  // 10. Audit Logs
  console.log('Creating Initial Audit Logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        userName: admin.fullName,
        userRole: 'ADMIN',
        action: 'UPDATE_TAX_RATES',
        entityType: 'TaxSetting',
        entityId: activeTaxSetting.id,
        details: 'Configured FY 2026-2027 base rates: Residential ₹8/sqft, Commercial ₹15/sqft, Industrial ₹18/sqft.',
      },
      {
        userId: officer1.id,
        userName: officer1.fullName,
        userRole: 'WARD_OFFICER',
        action: 'ISSUE_DEMAND_NOTICE',
        entityType: 'DemandNotice',
        entityId: 'DN-2026-0001',
        details: 'Issued formal demand notice with 15-day compliance deadline to PROP-W01-DEF01.',
      },
      {
        userId: citizenRajesh.id,
        userName: citizenRajesh.fullName,
        userRole: 'CITIZEN',
        action: 'MAKE_PAYMENT',
        entityType: 'Payment',
        entityId: payment1.id,
        details: `Successfully paid ₹${payment1.totalAmount} via Razorpay UPI. Receipt ${payment1.receiptNumber} generated.`,
      },
    ],
  });

  // 11. Notifications
  console.log('Creating Initial Notifications...');
  await prisma.notification.createMany({
    data: [
      {
        recipientUserId: citizenRajesh.id,
        targetRole: 'CITIZEN',
        title: 'Payment Successful',
        message: `Your payment of ₹${payment1.totalAmount} for property ${prop1.propertyId} was successful. Receipt: ${payment1.receiptNumber}`,
        type: 'SUCCESS',
        link: `/receipt/${payment1.receiptNumber}`,
      },
      {
        recipientUserId: citizenRajesh.id,
        targetRole: 'CITIZEN',
        title: 'Demand Notice Issued',
        message: `Demand Notice DN-2026-0001 has been issued for arrears on property ${def1.propertyId}. Please clear within 15 days.`,
        type: 'ALERT',
        link: `/notices`,
      },
      {
        recipientUserId: officer1.id,
        targetRole: 'WARD_OFFICER',
        title: 'New Reassessment Request',
        message: `Application REA-2026-0001 submitted for property ${prop1.propertyId} in Ward 01.`,
        type: 'INFO',
        link: `/officer/reassessments`,
      },
      {
        targetRole: 'ADMIN',
        title: 'System Startup',
        message: 'Municipal Property Tax Portal initialized for FY 2026-2027.',
        type: 'INFO',
        link: `/admin/reports`,
      },
    ],
  });

  console.log('✅ Database seeded successfully with realistic data!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
