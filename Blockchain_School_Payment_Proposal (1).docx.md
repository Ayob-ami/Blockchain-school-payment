

**PROJECT PROPOSAL**

**Development of a Blockchain-Based School Payment System**

**COURSE: CSC476**

*Submitted by:*

**Group: Group 16**

**TEAM MEMBERS:**

**ALASOADURA OLUWATOBILOBA EMMANUEL \- 236323**

**ADEWUYI THANNI AYOMIDE \- 236949**

**FARUQ ADERENI \- 243432**

**EZEOCHA OLUCHI STELLA \- 235734**

# **1\.  Background**

# The global education sector is currently grappling with a systemic crisis in financial administration, characterised by the persistence of manual reconciliation, high transaction costs, and a significant lack of transparency in fund disbursement. Traditionally, educational institutions have relied on centralised financial models that are increasingly incapable of meeting the demands of a high-velocity digital economy. This proposal examines the development of a blockchain-based payment system designed to overhaul the administrative and financial workflows of modern schools.

# **1.1  Inefficiencies in Traditional School Payment Systems**

The current financial architecture of many schools, particularly in emerging economies such as Nigeria, is a patchwork of disconnected systems. Tuition is frequently collected through one portal, while auxiliary services — cafeteria, transportation, and library fees — are managed through separate, often manual, platforms (Schoolites, 2026). This fragmentation results in finance teams spending up to 70% of their time on manual reconciliation (BSME, 2026).

In Nigerian state-owned universities, particularly in the South-East region, these inefficiencies have been identified as primary drivers of revenue mismanagement and systemic corruption. Manual processes, cash-based transactions, and the absence of real-time auditing create opportunities for fraudulent practices — most notably receipt forgery and sub-optimal utilisation of internally generated revenue (Nwankwo, 2025).

The consequences are not merely administrative; they carry profound socio-academic impacts. The Nigerian Education Loan Fund (NELFUND) recently faced a reconciliation crisis involving ₦927.98 million in outstanding upkeep payments, affecting over 11,000 students nationwide (BusinessDay, 2026). Research into South African financial aid disbursement further reveals that students experiencing payment delays suffer grade deterioration and an increased likelihood of dropping out (ResearchGate, 2026).

## **1.2  Blockchain Technology: Conceptual Foundations**

At its core, a blockchain is a digital, chronological record of transactions functioning as a distributed ledger where each "block" of data is cryptographically linked to the preceding one (IBM, 2026). For a school payment system, this technology provides three fundamental pillars: integrity, transparency, and decentralisation. Integrity is ensured through cryptographic hashing, which generates a unique identifier for each block; any attempt to alter earlier data would invalidate all subsequent hashes, making tampering immediately detectable.

The "trustless" nature of blockchain networks is particularly relevant for educational institutions operating in low institutional-trust environments. A trustless system means participants do not need to trust a central authority — such as a bursary clerk — because the protocol itself enforces transaction rules via consensus mechanisms such as Proof of Stake (PoS) or Proof of Authority (PoA) (BVNK, 2026).

## **1.3  Blockchain Architecture Models**

Three architectural models exist for blockchain deployment. Public blockchains (e.g., Ethereum, Solana) offer maximum decentralisation but are subject to volatile gas fees. Private (permissioned) blockchains provide speed and data control but reintroduce a single point of failure. Consortium blockchains — governed by a group of stakeholders such as a university, the Ministry of Education, and partner banks — are widely regarded as the most suitable model for educational ecosystems, providing the hybrid benefits of decentralised verification among trusted partners while preserving confidentiality of student data (FUT Minna, 2026).

## **1.4  Smart Contracts in Education**

Smart contracts are self-executing programs stored on the blockchain that automatically trigger actions when pre-defined conditions are met (eLearning Industry, 2026). In an educational context, a Tuition Smart Contract can be programmed to release a digital receipt, update a student's enrolment status to "Active", and automatically grant access to library and LMS platforms the instant a payment is verified. This "atomic settlement" logic ensures no partial transaction failures — either all actions complete together, or the entire transaction is reverted.

**2\.  Problem Statement**

Nigerian educational institutions continue to rely on fragmented, manual financial systems that are demonstrably inadequate for the demands of modern academic administration. Specifically, the following problems persist:

* Receipt forgery and manual record alteration enable fraudulent diversion of school fees, undermining the integrity of institutional revenue.

* Finance departments spend disproportionate time on manual reconciliation — up to 70% — rather than on strategic administrative functions.

* There is no real-time visibility into payment status for parents, students, or auditors, fostering an environment of opacity and limited accountability.

* Delayed payment verification — caused by disconnected portals between banks and bursary systems — results in students being wrongly blocked from academic services despite having paid.

* Transaction fees charged by traditional payment gateways (1.5%–3.9%) represent a significant and unnecessary cost burden on students and institutions.

* The absence of an immutable, tamper-proof audit trail makes it difficult for regulatory bodies and institutional management to detect and prosecute financial misconduct.

These systemic deficiencies collectively impede academic continuity, erode institutional trust, and create conditions conducive to corruption — challenges that a blockchain-based payment architecture is uniquely positioned to address.

**3\.  Aim and Objectives**

## **3.1  Aim**

The primary aim of this project is to design, develop, and validate a blockchain-based school payment system that eliminates manual reconciliation, enhances financial transparency, and automates administrative workflows in Nigerian educational institutions through smart contract technology.

## **3.2  Objectives (Milestones)**

The following specific objectives guide the execution of this project:

* Milestone 1 — Feasibility & Requirement Analysis (Months 1–2): Conduct a thorough feasibility study of existing payment workflows at a target institution; identify system requirements and select the most appropriate blockchain architecture (Consortium model).

* Milestone 2 — System Design & Prototype (Months 3–4): Design the UX/UI for the student digital wallet and administrative dashboard; develop and deploy core smart contracts (tuition payment, instalment enforcement, role-based access control) to a test network (Sepolia testnet).

* Milestone 3 — Middleware & Integration (Months 5–6): Develop middleware connectors (Oracle/Chainlink integration) to bridge the blockchain backend with the institution's existing ERP and Student Information System (SIS) via secure REST APIs.

* Milestone 4 — Pilot Deployment & Training (Months 7–9): Deploy the system to a limited pilot cohort (e.g., a single faculty or first-year cohort); collect performance data; train finance staff on ledger management and system operation.

* Milestone 5 — Full Rollout & Evaluation (Month 10+): Scale the system institution-wide; continuously monitor KPIs including reconciliation error rates, average settlement time, and administrative labour hours; publish evaluation findings.

**4\.  Methodology**

The project adopts an Agile-Iterative development methodology, progressing through five structured phases. Each phase produces a deliverable that informs the next, enabling continuous evaluation and improvement.

## **4.1  Phase 1: Conceptualisation and Feasibility**

Stakeholder interviews, document analysis of existing payment workflows, and comparative assessment of blockchain architectures are conducted. Key performance indicators (KPIs) — such as percentage reduction in reconciliation errors and average settlement time — are defined to benchmark system performance.

## **4.2  Phase 2: Smart Contract Development**

Core business logic is encoded into Solidity smart contracts and deployed on the Ethereum-compatible testnet. Contracts implement: (a) tuition payment and receipt automation, (b) instalment credit enforcement, (c) role-based access control (RBAC) for authorised accounts (Registrar, Bursar), and (d) automatic enrolment status updates upon payment confirmation.

## **4.3  Phase 3: Middleware and Legacy System Integration**

An Oracle middleware layer (Chainlink) is implemented to bridge off-chain data — such as bank confirmations and ERP records — with on-chain smart contracts. For institutions using legacy ERP systems (e.g., Oracle Fusion Cloud), a REST API normalisation layer is created to convert blockchain events into standard API calls, preserving existing administrative interfaces.

## **4.4  Phase 4: Security Auditing and Testing**

Multiple independent security audits of smart contracts are performed. Industry-standard libraries (OpenZeppelin) are employed to mitigate common vulnerabilities. Load and stress testing is conducted to validate performance under peak-enrolment transaction volumes. Stablecoins (USDC/USDT) are adopted to eliminate cryptocurrency price volatility risk.

## **4.5  Phase 5: Pilot Deployment and Evaluation**

The system is deployed to a pilot cohort, with real-time monitoring of all KPIs. Qualitative data is gathered from student and staff users via structured surveys. Findings are iteratively incorporated before institution-wide rollout.

## **4.6  System Architecture Diagram**

The illustrative model below depicts the end-to-end transaction and data flow across the proposed system:

| Layer | Components | Function |
| :---- | :---- | :---- |
| **Presentation Layer** | Student Mobile Wallet / Parent Web Portal | Initiate payments; view transaction history and receipts |
| **Application Layer** | Smart Contracts (Solidity) | Enforce payment rules; trigger enrolment and access updates automatically |
| **Oracle/Middleware Layer** | Chainlink Oracle / REST API Bridge | Relay off-chain data (bank confirmations, ERP records) to on-chain contracts |
| **Blockchain Layer** | Consortium Network (Hyperledger / zkEVM) | Immutable ledger; consensus validation; cryptographic hashing of all records |
| **Legacy Integration Layer** | ERP / Student Information System (SIS) | Receive on-chain triggers; update administrative records and student status |
| **Compliance Layer** | NDPA 2023 / NDPC / NITDA Policy | Data minimisation; anonymisation; alignment with National Blockchain Policy |

**5\.  Software, Algorithms, and Hardware**

## **5.1  Software and Algorithms**

| Category | Tool / Technology | Purpose |
| :---- | :---- | :---- |
| **Blockchain Platform** | Ethereum (zkEVM / Arbitrum L2) | Core distributed ledger; low-cost, high-throughput transaction processing |
| **Smart Contract Language** | Solidity | Encoding payment logic, RBAC, and instalment enforcement |
| **Security Libraries** | OpenZeppelin Contracts | Industry-standard, audited contract templates to prevent exploits |
| **Oracle Middleware** | Chainlink | Secure off-chain data relay to on-chain smart contracts |
| **Consensus Algorithm** | Proof of Authority (PoA) | Energy-efficient validation suited to a permissioned consortium network |
| **Privacy Algorithm** | Cryptographic Hashing (SHA-256) | Data minimisation compliance — only hashes of documents stored on-chain |
| **Stablecoin** | USDC / USDT | Eliminates cryptocurrency price volatility; pegged to fiat currency |
| **Development Framework** | Hardhat / Truffle | Smart contract compilation, testing, and testnet deployment |
| **API Integration** | REST API / Node.js | Normalisation layer bridging blockchain events and legacy ERP systems |
| **Front-End** | React.js / React Native | Student wallet web and mobile interfaces |
| **Testing Network** | Sepolia Testnet | Functional and load testing prior to mainnet deployment |

## **5.2  Hardware Requirements**

| Component | Specification | Role |
| :---- | :---- | :---- |
| **Validator Nodes** | Dedicated servers (≥16GB RAM, ≥500GB SSD, 1Gbps NIC) | Host consortium blockchain nodes for transaction validation and ledger storage |
| **Application Server** | Cloud-hosted VM (AWS / Azure) | Run middleware, API services, and smart contract interaction layer |
| **Student Devices** | Any smartphone or computer with internet access | Access student wallet and payment portal (no special hardware required) |
| **Backup Infrastructure** | Geographically distributed redundant nodes | Ensure system availability and disaster recovery |

**6\.  Assumptions**

The following assumptions are made in the design and scoping of this project:

* The target institution has existing internet infrastructure capable of supporting API-based integration between legacy ERP systems and the proposed blockchain middleware.

* Students and parents have access to smartphones or computers with reliable internet connectivity sufficient to use the digital wallet interface.

* The institution's management and finance staff will commit to a structured training programme prior to system rollout.

* A consortium blockchain model is adopted, meaning at least one partner bank and the relevant government ministry (e.g., Ministry of Education) will participate as consortium nodes.

* Stablecoins (USDC/USDT) are used as the payment medium to eliminate cryptocurrency price volatility; it is assumed that regulatory approval for stablecoin usage in institutional payments can be obtained under Nigeria's National Blockchain Policy.

* The institution's existing ERP or Student Information System supports REST API connectivity for middleware integration.

* Transaction volumes will not exceed 10,000 concurrent transactions during peak registration periods, within the validated capacity of the selected Layer 2 network.

* Smart contract code will be independently audited before mainnet deployment; any critical vulnerabilities identified will be resolved before the pilot phase commences.

**7\.  Justification for the Project**

## **7.1  Financial and Operational Benefits**

The transition to a blockchain-based payment system offers quantifiable economic benefits. Traditional Nigerian payment gateways (Remita, Paystack, Interswitch) charge transaction fees of 1.5%–3.9%; Layer 2 blockchain transactions cost as little as $0.05 per transaction (Arbitrum, 2026). For an institution processing thousands of fee payments annually, this represents a substantial reduction in operational costs. Institutions utilising stablecoins for payments have reported up to 60% savings in cross-border B2B transaction costs, with settlement completed in minutes rather than days (Stripe, 2026).

Furthermore, by eliminating receipt forgery and unauthorised record alteration, the system ensures 100% accurate recording of collected fees — directly addressing the revenue leakage problem identified in South-East Nigerian universities. Automating reconciliation frees finance personnel from administrative burden, enabling redeployment to higher-value roles.

## **7.2  Regulatory and Policy Alignment**

The proposed system is directly aligned with Nigeria's National Blockchain Policy and NITDA's Strategic Roadmap 2.0 (2024–2027), which specifically promotes blockchain adoption in educational institutions under Pillar 5 (Digital Services Development). Compliance with the Nigeria Data Protection Act (NDPA) 2023 is achieved through data minimisation — storing only cryptographic hashes of documents on-chain rather than raw personal data — satisfying the right to privacy without compromising immutability.

## **7.3  Academic and Societal Impact**

Delays in fee processing have been empirically linked to student academic underperformance and dropout in Nigerian and South African contexts (ResearchGate, 2026; BusinessDay, 2026). By providing instant payment confirmation and automatic service access, the proposed system directly reduces the academic disruption caused by administrative bottlenecks. The long-term vision — encompassing Decentralised Identifiers (DIDs) for student credential ownership and token-based academic incentives — positions participating institutions at the forefront of the global Web3 education transformation.

**8\.  References**

Arbitrum Foundation. (2026). Layer 2 gas fees and transaction performance. Retrieved from https://arbitrum.io/

BitGo. (2026). Crypto and Bitcoin transaction fees explained. Retrieved from https://www.bitgo.com/resources/blog/crypto-transaction-fees-explained/

BusinessDay Nigeria. (2026). 11,685 students affected as NELFUND reconciles N927.98m outstanding upkeep payments. Retrieved from https://stg18326.businessday.ng/news/article/11685-students-affected-as-nelfund-reconciles-n927-98m-outstanding-upkeep-payments/

BVNK. (2026). Blockchain payments in 2026: A step-by-step guide for businesses. Retrieved from https://bvnk.com/blog/blockchain-payments

Chainlink. (2026). Blockchain legacy system integration guide. Retrieved from https://chain.link/article/blockchain-legacy-system-integration

Classter. (2026). Blockchain in academics: Verification processes in school management systems. Retrieved from https://www.classter.com/blog/edtech/blockchain-in-academics-roadmap-for-verification-processes-in-school-management-systems/

Colorado Department of Higher Education. (2026). Blockchain in education. Retrieved from https://cdhe.colorado.gov/blockchain

DLA Piper. (2026). Data protection laws in Nigeria. Retrieved from https://www.dlapiperdataprotection.com/index.html?t=law\&c=NG

eLearning Industry. (2026). The role of blockchain in the education industry. Retrieved from https://elearningindustry.com/the-role-of-blockchain-in-the-education-industry

eLearning Industry. (2026). Blockchain in education: Use cases and challenges. Retrieved from https://elearningindustry.com/blockchain-in-education-use-cases-and-challenges

FACTS Management. (2026). 5 challenges schools face managing tuition payments manually. Retrieved from https://factsmgt.com/blog/challenges-schools-face-managing-tuition-payments-manually/

Federal Ministry of Communications, Innovation and Digital Economy (FMCIDE). (2026). Whitepaper on the National Blockchain Policy. Retrieved from https://fmcide.gov.ng/whitepaper-on-the-national-blockchain-policy/

Federal University of Technology Minna (FUT Minna). (2026). Integration of consortium blockchain model in the Nigerian banking sector. Retrieved from http://irepo.futminna.edu.ng:8080/jspui/bitstream/123456789/18998/1/

IBM. (2026). What are the benefits of blockchain? Retrieved from https://www.ibm.com/think/topics/benefits-of-blockchain

MDPI Electronics. (2023). Toward building smart contract-based higher education systems using zero-knowledge Ethereum virtual machine. Electronics, 12(3), 664\. https://www.mdpi.com/2079-9292/12/3/664

MoogleLabs. (2026). Blockchain EdTech marketplace with NFT and token payments. Retrieved from https://www.mooglelabs.com/case-study/blockchain-powered-edtech-marketplace

National Information Technology Development Agency (NITDA). (2023). National Blockchain Policy for Nigeria. Retrieved from https://nitda.gov.ng/wp-content/uploads/2023/05/National-Blockchain-Policy.pdf

NITDA. (2024). Strategic Roadmap and Action Plan 2.0 (SRAP 2.0). Retrieved from https://nitda.gov.ng/wp-content/uploads/2024/02/SRAP-2.O.pdf

NOWPayments. (2026). Best payment gateways in Nigeria 2026\. Retrieved from https://nowpayments.io/blog/payment-gateway-nigeria

Nwankwo, O. P. (2025). Challenges of electronic payment in selected state universities in South East Nigeria, 2015–2022. International Journal of Public Administration and Development Studies. https://ijpads.com/index.php/ijpads/article/download/59/62

Pixelplex. (2026). Benefits of blockchain in K-12 education. Retrieved from https://pixelplex.io/blog/benefits-of-blockchain-in-k-twelve-education/

PMC / NCBI. (2022). A consortium blockchain-based secure and trusted electronic portfolio management scheme. PMC8839319. Retrieved from https://pmc.ncbi.nlm.nih.gov/articles/PMC8839319/

ResearchGate. (2026). Blockchain use in disbursing financial aid at higher education institutions. Retrieved from https://www.researchgate.net/publication/400981535

ResearchGate. (2022). Designing an Ethereum-based blockchain for tuition payment system using smart contract service. Retrieved from https://www.researchgate.net/publication/360275937

SCAND. (2026). Blockchain for global payments: Use cases and benefits. Retrieved from https://scand.com/company/blog/blockchain-in-payments/

SCNSoft. (2026). Blockchain implementation in 2026: Roadmap, costs, skills. Retrieved from https://www.scnsoft.com/blockchain/implementation

Schoolites. (2026). Fee reconciliation challenges in schools. Retrieved from https://schoolites.com/school-problems/fee-reconciliation-challenges

Stripe. (2026). Blockchain for payments: A guide for businesses. Retrieved from https://stripe.com/resources/more/blockchain-for-payments

The British School of Middle East (BSME). (2026). The real cost of outdated school payment systems. Retrieved from https://www.bsme.org.uk/the-real-cost-of-outdated-school-payment-systems

University of Cape Coast Law Journal. (2025). A critical analysis of the Nigeria Data Protection Act. UCC Law Journal, 4(2), 242–263. https://doi.org/10.47963/ucclj.v4i2.1724

World Economic Forum. (2020). Bridging the governance gap: Interoperability for blockchain and legacy systems. Retrieved from https://www3.weforum.org/docs/WEF\_Interoperability\_C4IR\_Smart\_Contracts\_Project\_2020.pdf