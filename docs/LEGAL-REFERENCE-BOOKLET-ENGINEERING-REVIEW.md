# South African Law Reference Booklet — Engineering Review

**Source reviewed:** `SA_Law_That_Applies_to_LMU.pdf`, LittleMindsUniverse.co.za, Legal Compliance Reference Booklet, Version 1.0 (2026), 19 pages.
**Review type:** Engineering and product-risk triage, not a legal opinion.
**Required reviewer:** South African attorney experienced in POPIA, child protection, digital platforms and communications law.

## Executive position

The booklet is useful as a first compliance inventory. Its core direction—privacy by design, guardian involvement, child safeguarding, age-appropriate content, transparent communication archiving, school data agreements, consumer transparency and clear accreditation claims—is relevant to LMU.

However, some statutory descriptions and section references are inaccurate or stated too categorically. Do not convert the booklet verbatim into production legal policy or encode every statement as a statutory requirement until counsel has verified it against the current consolidated legislation, commencement proclamations and regulations.

## Material legal-reference issues to resolve

1. **POPIA: children's information vs special personal information.** The booklet describes all children's information as a special category under section 35. POPIA separates special personal information (sections 26–33) from processing of children's personal information (sections 34–35). A child's information can also be special personal information where it falls into one of the section 26 categories, but the categories are not interchangeable. Section 35(1) includes prior consent of a competent person and other statutory authorisations; the Act does not make consent the only possible route in every case. LMU should nevertheless adopt a robust, recorded guardian-consent gate as a product safeguard, subject to counsel confirming the competent-person, age and consent model.

2. **POPIA breach notification timing.** The booklet states a fixed 72-hour Information Regulator deadline under POPIA. Section 22(2) of POPIA says notification must be made as soon as reasonably possible after discovery, subject to the statutory considerations. Do not describe 72 hours as POPIA's universal statutory deadline. Keep an internal rapid-response target, and have counsel map any separate reporting duties that may apply.

3. **Cybercrimes Act section references.** The booklet labels section 54 as cyberbullying and section 24 as malicious communications. In the Cybercrimes Act 19 of 2020, section 24 concerns jurisdiction; malicious-communication offences are in sections 14–16; section 54 concerns reporting obligations of electronic communications service providers and financial institutions for prescribed categories of offences. The consolidated source reviewed also records section 54 as requiring proclamation for commencement; counsel must verify current commencement and regulations before treating it as operative. Do not publish or implement the booklet's section labels as written.

4. **Cooling-off periods.** The booklet states that electronically signed agreements generally carry a five-business-day cooling-off period. The Consumer Protection Act section 16 five-business-day right concerns transactions resulting from direct marketing and does not apply where ECTA section 44 applies. ECTA section 44 provides a seven-day cooling-off right for services, subject to its terms. LMU's subscription flow and sales channels need a transaction-specific legal analysis rather than one blanket period.

5. **RICA recording indicator.** RICA section 5 expressly addresses prior written consent of one party to interception; section 6 addresses certain business-related interception conditions. The reviewed statutory text does not itself establish the booklet's broad statement that a visible REC indicator is a universal express RICA requirement for every voice/video call. A persistent recording/archiving indicator and clear pre-use disclosure remain sensible high-priority transparency and child-safety controls; counsel must determine the applicable RICA basis for each Connect communication mode and archive.

6. **Children's Act / parental oversight.** The best-interests standard is central, but the booklet's statement that parents must be able to review every activity log and disable any feature should be validated against the child's age, maturity, rights, the parent/guardian's legal authority and the feature's purpose. Implement carefully designed guardian controls without treating parental access as unlimited or overriding child-safety/confidentiality considerations.

7. **AI processing and anonymisation.** Anonymising child prompts before an external AI call is a strong privacy-by-design control, but the booklet's blanket formulation should not be treated as a complete POPIA analysis. Counsel must review the lawful basis/section 35 route, purpose compatibility, operator agreements, cross-border transfers, retention, security, automated decision-making (section 71), provider training/retention terms and whether the data is genuinely de-identified rather than merely pseudonymised.

8. **School relationships and FICA.** A school does not automatically become a joint responsible party solely because it subscribes; the roles depend on who determines the purposes and means of processing. Likewise, use of a payment gateway does not automatically settle whether LMU itself has any FICA status or obligations. Both require fact-specific advice and agreements.

## Engineering controls to design into LMU now

These are product safeguards and release gates, not assertions that every detail is expressly required by one section of an Act:

- Separate guardian/teacher/learner roles and enforce least-privilege access server-side.
- Obtain and retain auditable guardian authorisation before creating or processing child profiles, after counsel approves the consent model.
- Keep data collection minimal; explain purpose at collection; support correction, access, objection/withdrawal where applicable, and deletion/retention workflows.
- Maintain a data inventory, processing register, retention schedule, breach playbook, operator register and signed processing agreements.
- Do not send direct identifiers, raw child chat history, voice or video to an AI provider by default. Minimise and de-identify where appropriate; document the residual re-identification risk and lawful basis.
- Treat Milo-generated lessons, evaluations, interventions and recommendations as drafts. A teacher must approve, decline or edit them; Milo must not independently assign or approve academic decisions.
- Restrict teacher-student communications to authorised, monitored school/class contexts; provide reporting/flagging and escalation workflows; maintain moderation audit trails.
- Enforce age-appropriate content and access boundaries across all LMU modules.
- For Connect, disclose archiving before use, show a persistent call indicator as a safety/transparency measure, restrict archive access, and define a justified retention schedule.
- Publish plain-language legal documents, business identity/contact details, subscription prices and cancellation terms before relevant transactions.
- Keep school-linked records distinguishable from parent-registered records and execute school data-sharing terms before school data is imported.
- Clearly distinguish certificates of completion from accredited qualifications until accreditation is verified.

## Release gates

**BLOCKER before child-data collection:** counsel-approved Privacy Policy, Terms, guardian consent mechanism, Information Officer registration/role, data inventory, retention/deletion design, vendor/operator contracts and breach process.

**BLOCKER before Connect communications go live:** counsel-approved communications/archiving basis, pre-use notice, access restrictions, reporting and moderation controls, retention schedule and safeguarding escalation.

**BLOCKER before school partnerships:** agreed data-sharing and role allocation, school administrator controls, teacher verification/deactivation and school-specific privacy notices.

**BLOCKER before paid subscriptions:** reviewed ECTA/CPA disclosures, pricing, cancellation/refund and renewal flows, business identity/contact details and payment-provider responsibilities.

**BLOCKER before Milo processes learner data:** approved AI provider and DPA/operator terms, child-data lawful basis and notice, minimisation/de-identification design, cross-border assessment, retention controls, content safety and human academic approval.

## Primary legal references checked for this triage

- POPIA Act 4 of 2013, especially sections 1, 8–25, 34–35, 55–56, 69, 71–72: https://www.justice.gov.za/legislation/acts/2013-004.pdf
- Children's Act 38 of 2005, especially section 7: https://www.justice.gov.za/legislation/acts/2005-038%20childrensact.pdf
- RICA Act 70 of 2002, especially sections 5–6: https://www.justice.gov.za/legislation/acts/2002-070.pdf
- Cybercrimes Act 19 of 2020: https://www.gov.za/documents/acts/cybercrimes-act-19-2020-english-afrikaans-01-jun-2021
- ECTA Act 25 of 2002, especially sections 43–44: https://www.saflii.org/za/legis/consol_act/ecata2002427/
- Consumer Protection Act 68 of 2008, especially section 16: https://www.gov.za/sites/default/files/32186_467.pdf

**No legal policy has been published or represented as attorney-approved by this engineering review.**
