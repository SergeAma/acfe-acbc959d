import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";

export const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              A Cloud for Everyone ("ACFE", "we", "us", or "our") provides our Internet site and the content, products, and services offered on or through it (collectively, the "Services") to you subject to the following Terms of Service ("TOS"). Your use of the Services constitutes your binding acceptance of these TOS. If you do not agree to these TOS, you should not use the Services.
            </p>
            <p className="text-muted-foreground mt-4">
              Some Services may be subject to additional posted rules, policies, and terms. When you use those Services, you and ACFE shall be subject to those additional conditions, which are incorporated by reference into these TOS. In the event of an inconsistency between these TOS and any additional posted conditions or separate usage terms, the provisions of the additional conditions and/or separate usage terms shall control.
            </p>
            <p className="text-muted-foreground mt-4">
              We may modify all or any part of these TOS from time to time without notice to you, and you should check back often to be aware of your current rights and responsibilities. Your continued use of the Services after changes to the TOS have been published constitutes your binding acceptance of the updated TOS. If at any time the TOS are no longer acceptable to you, you should immediately cease all use of the Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Services</h2>
            <p className="text-muted-foreground">
              The Services include educational content, courses, mentorship programs, and community features created by us, our mentors, and third-party content suppliers. Additionally, some Services provide you and other users with an opportunity to submit, post, display, transmit and/or exchange information, ideas, opinions, photographs, images, video, creative works or other information, messages, transmissions or material to us or others on or through the Services (collectively, the "Postings").
            </p>
            <p className="text-muted-foreground mt-4">
              We strive to provide informative and relevant content, but the Services are provided "AS IS", as further described in Section 15 of these TOS, and we do not guarantee the accuracy, integrity or quality of any content available on or through the Services.
            </p>
            <p className="text-muted-foreground mt-4">
              You may communicate with or receive communications from third parties (e.g., mentors, other learners, partners) as a result of your use of the Services. All such communication, interaction and participation are strictly between you and such third party, and ACFE shall not be responsible or liable to you in any way in connection with these activities or transactions.
            </p>
            <p className="text-muted-foreground mt-4">
              The appearance or availability of links to third-party sites on or through the Services does not constitute an endorsement by ACFE. You are responsible for obtaining access to the Services, which may involve third-party fees (such as Internet service provider or airtime charges). You must provide and are responsible for all equipment necessary to access the Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. General Rules of Conduct</h2>
            <p className="text-muted-foreground">
              Your use of the Services is subject to all applicable local, national and international laws and regulations, and you agree not to violate such laws and regulations. Additionally, you agree that you will not:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
              <li>Interfere with another user's use and enjoyment of the Services</li>
              <li>Interfere with or disrupt the security measures of the Services</li>
              <li>Interfere with or disrupt networks connected to the Services, and will comply with all regulations, policies and procedures of such networks</li>
              <li>Use the Services to send or result in the transmission of junk email, chain letters, duplicative or unsolicited messages, or so-called "spamming"</li>
              <li>Harm minors in any way</li>
              <li>Promote or generate revenue for any business or commercial purposes, whether or not for a charge or through linking with any other web services or pages, unless authorized by ACFE</li>
              <li>Impersonate any person or entity</li>
              <li>Intentionally or unintentionally violate any applicable local, national or international law</li>
              <li>"Stalk" or otherwise harass another</li>
              <li>Collect or store personal data about other users</li>
              <li>Reproduce, modify, distribute or republish materials contained on the Service (either directly or by linking) without prior written permission from us. You may download material from the site for your personal, noncommercial use only.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Postings</h2>
            <p className="text-muted-foreground">
              While we reserve the right to edit Postings prior to their inclusion on the Services, as a general matter ACFE does not screen or monitor such content. You are solely responsible for all Postings and other materials, whether publicly posted or privately transmitted, that are uploaded, posted, emailed, transmitted or otherwise made available from your email address on or through the Services. Your Postings will not:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
              <li>Be false, inaccurate, or misleading</li>
              <li>Infringe any third party's rights</li>
              <li>Violate any law or regulation</li>
              <li>Be defamatory, unlawfully threatening or harassing</li>
              <li>Be obscene or contain inappropriate content</li>
              <li>Contain viruses or other harmful components</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You grant ACFE and its affiliates a perpetual, worldwide, royalty-free, irrevocable, nonexclusive right and license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, perform and display all Postings submitted by you or through your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. ACFE's Proprietary Rights</h2>
            <p className="text-muted-foreground">
              All Services software, design, text, images, photographs, illustrations, audio and video material, artwork, graphic material, database, proprietary information and all legally protectable elements of the Services, including, but not limited to, the selection, sequence and 'look and feel' and arrangement of items, and all trademarks, service marks and trade names, excluding any of your Postings, are the property of ACFE, Spectrogram UK LTD, its subsidiaries, affiliates, licensors or suppliers and are legally protected. You may not reproduce, modify, create derivative works from, display, perform, publish, distribute, disseminate, broadcast or circulate to any third party any materials contained on the Services without prior written consent from us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Community Forums and Cohorts</h2>
            <p className="text-muted-foreground">
              Some Services give users the opportunity to participate in community forums, cohort discussions, and mentorship interactions operated by ACFE or by a third party. Exercise appropriate caution when participating in any community feature. Do not publicly disclose personal identifying information. You agree to use the community features only to send and receive messages and material that are proper and related to learning and professional development.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Mentor and Student Profiles</h2>
            <p className="text-muted-foreground">
              Some Services allow users to make personal information available to other visitors as part of a profile or mentor directory. If you do not want certain information to be available to other users, do not include it in any profile listing. We reserve the right to refuse or remove listings in our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Idea Submissions and Incubator</h2>
            <p className="text-muted-foreground">
              Some Services allow users to submit ideas for the Innovators Incubator program. By submitting ideas, you acknowledge that ACFE may provide mentorship, feedback, and guidance on your ideas. You retain ownership of your intellectual property, and ACFE does not claim ownership of ideas submitted through the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Fee-Based Services</h2>
            <p className="text-muted-foreground">
              Some Services, including certain courses, require a fee to access or use. You agree to pay all fees and charges incurred. Fees and charges are payable in accordance with payment terms in effect at the time the fee or charge becomes payable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Registration Obligations</h2>
            <p className="text-muted-foreground">
              Some Services require registration. You agree to provide accurate information and update it as necessary. If you provide information that is untrue, inaccurate, not current or incomplete, we have the right to suspend or terminate your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Passwords and Other Security Issues</h2>
            <p className="text-muted-foreground">
              If we issue you a password, you agree to protect it and change it if its security has been compromised. You may not transfer your registration, password or username to another person or share it with anyone.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Privacy Policy</h2>
            <p className="text-muted-foreground">
              ACFE respects your privacy. Please see our{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>{" "}
              for information on the collection and use of your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Service Deactivation or Termination</h2>
            <p className="text-muted-foreground">
              We have the right to restrict, suspend or terminate your access to all or any part of our Services, refuse or remove any material submitted on or through the Services, deactivate or delete your accounts, and establish general practices and limits concerning use of the Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">14. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify, defend and hold ACFE, Spectrogram UK LTD, its subsidiaries, affiliates, and their respective officers, directors, owners, employees, agents, licensors, representatives, licensors and suppliers (collectively, the "ACFE Parties"), harmless from and against any and all liability, losses, expenses, damages and costs (including attorneys' fees), incurred by any ACFE Party in connection with any claim arising out of your use of the Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">15. Disclaimers of Warranties</h2>
            <p className="text-muted-foreground">
              The Services are provided "as is" and "as available", without any representation, promise or warranty of any kind, express or implied, or any guarantee or assurance that the Services will be available for use, or uninterrupted or error-free. Any material downloaded or otherwise obtained through our Services is done at your own discretion and risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">16. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              In no event shall any ACFE Party be liable to you or any other person or entity, under any theory, for damages of any kind arising from the use of the Services, including but not limited to direct, indirect, incidental, punitive, special or consequential damages, lost income, revenue or profits, lost or damaged data, or other commercial or economic loss. If applicable law does not allow the limitation or exclusion of liability or damages, the total liability of any ACFE Party shall not exceed one hundred pounds (£100).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">17. Miscellaneous</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-3">
              <li><strong>General:</strong> This site is created, controlled, and operated by A Cloud for Everyone, an initiative by Spectrogram UK LTD, in the UK.</li>
              <li><strong>Entire Agreement:</strong> These TOS, including the policies referred to in these TOS, constitute the entire agreement between you and ACFE.</li>
              <li><strong>Notice:</strong> We may notify you of certain events via email or posting on the Services.</li>
              <li><strong>Assignment:</strong> These TOS may be assigned by ACFE in connection with a merger, acquisition, reorganization or sale of assets.</li>
              <li><strong>Choice of Law and Forum:</strong> These TOS shall be governed by and construed in accordance with the laws of England and Wales. Any dispute shall be subject to the exclusive jurisdiction of the courts of England and Wales.</li>
              <li><strong>No Third-Party Beneficiaries:</strong> There are no third-party beneficiaries to these TOS.</li>
              <li><strong>Waiver and Severability:</strong> The failure to exercise or enforce any right or provision of the TOS shall not constitute a waiver of such right or provision. If any provision is found to be invalid, the remaining provisions shall remain in full force and effect.</li>
              <li><strong>Statute of Limitations:</strong> Any claim or cause of action must be filed within one (1) year after such claim or cause of action arose or be forever barred.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">18. Violations</h2>
            <p className="text-muted-foreground">
              For questions about these Terms of Service, the practices of this site or any dealings with A Cloud for Everyone, contact us at{" "}
              <a href="mailto:contact@acloudforeveryone.org" className="text-primary hover:underline">
                contact@acloudforeveryone.org
              </a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};
