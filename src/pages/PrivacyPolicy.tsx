import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Notice</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">I. Name and Address of the Data Controller and Contact Details of the Data Protection Officer</h2>
            <p className="text-muted-foreground">
              The controller within the meaning of the General Data Protection Regulation (GDPR) and other national data protection laws of the member states as well as other data protection regulations is:
            </p>
            <div className="text-muted-foreground mt-4">
              <p className="font-medium">A Cloud for Everyone (ACFE)</p>
              <p>An initiative by Spectrogram UK LTD</p>
              <p>The Brew Eagle House</p>
              <p>163 City Rd</p>
              <p>London EC1V 1NR</p>
              <p>United Kingdom</p>
            </div>
            <p className="text-muted-foreground mt-4">
              You can contact our Data Protection Officer via email at{" "}
              <a href="mailto:contact@acloudforeveryone.org" className="text-primary hover:underline">
                contact@acloudforeveryone.org
              </a>{" "}
              or at the above address.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">II. Provision of the Website and Creation of Log Files</h2>
            
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">1. Description and Scope of Data Processing</h3>
            <p className="text-muted-foreground">
              Each time you visit our website, our system automatically collects data and information from the computer system of the calling computer. The following data is collected:
            </p>
            <ol className="list-decimal list-inside text-muted-foreground mt-2 space-y-1">
              <li>Information about the browser type and version used</li>
              <li>The operating system of the user</li>
              <li>The IP address of the user</li>
              <li>Date and time of access</li>
              <li>Websites that are called up by the user's system via our website</li>
            </ol>
            <p className="text-muted-foreground mt-4">
              The data is also stored in the log files of our system. A storage of this data together with other personal data of the user does not take place.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2. Legal Basis for Data Processing</h3>
            <p className="text-muted-foreground">
              The legal basis for the temporary storage of the data and the log files is Art. 6 para. 1 lit. f GDPR.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">3. Purpose of Data Processing</h3>
            <p className="text-muted-foreground">
              The temporary storage of the IP address by the system is necessary to enable delivery of the website to the user's computer. For this purpose, the user's IP address must remain stored for the duration of the session.
            </p>
            <p className="text-muted-foreground mt-4">
              The storage in log files is done to ensure the functionality of the website. In addition, we use the data for the technical optimization of the website and to ensure the security of our information technology systems. An evaluation of the data for marketing purposes does not take place in this context.
            </p>
            <p className="text-muted-foreground mt-4">
              These purposes are also our legitimate interest in data processing according to Art. 6 para. 1 lit. f GDPR.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4. Duration of Storage</h3>
            <p className="text-muted-foreground">
              The data is deleted as soon as it is no longer required to achieve the purpose for which it was collected. In the case of the collection of data for the provision of the website, this is the case when the respective session has ended.
            </p>
            <p className="text-muted-foreground mt-4">
              In the case of storage of data in log files, this is the case after seven days at the latest. Storage beyond this period is possible. In this case, the IP addresses of the users are deleted or anonymized, so that an assignment of the calling client is no longer possible.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">5. Possibility of Objection and Removal</h3>
            <p className="text-muted-foreground">
              The collection of data for the provision of the website and the storage of the data in log files is mandatory for the operation of the website. Consequently, there is no possibility of objection on the part of the user.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">6. Session Security and Fraud Prevention</h3>
            <p className="text-muted-foreground">
              We collect IP addresses and device fingerprints for security purposes, including session management and fraud prevention. This data helps us detect unauthorized account access and protect your account from potential threats. By using our service, you consent to this collection as necessary for the security of your account.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">7. Analytics</h3>
            <p className="text-muted-foreground">
              We use various analytics services to set log files on our website. Details about these services and data processing will be provided as applicable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">III. Use of Cookies</h2>
            
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">1. Description and Scope of Data Processing</h3>
            <p className="text-muted-foreground">
              Our website uses cookies. Cookies are text files that are stored in the Internet browser or by the Internet browser on the user's computer system. When a user accesses a website, a cookie may be stored on the user's operating system. This cookie contains a characteristic string of characters that enables the browser to be uniquely identified when the website is called up again.
            </p>
            <p className="text-muted-foreground mt-4">
              We use cookies to make our website functional. Some elements of our website require that the calling browser can be identified even after a page change.
            </p>
            <p className="text-muted-foreground mt-4">
              When calling up our website, the user is informed about the use of cookies and, if necessary, their consent to the processing of personal data used in this context is obtained. In this context, there is also a reference to this privacy policy.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2. Legal Basis for Data Processing</h3>
            <p className="text-muted-foreground">
              The use of technically necessary cookies and similar techniques is based on Section 25 (2) No. 2 TTDSG. Subsequent data processing takes place on the basis of legitimate interests pursuant to Art. 6 para. 1 p. 1 lit. f GDPR.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">3. Purpose of Data Processing</h3>
            <p className="text-muted-foreground">
              The purpose of using technically necessary cookies is to enable the use of websites for users. Some functions of our website cannot be offered without the use of cookies. For these, it is necessary that the browser is recognized even after a page change.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4. Duration of Storage, Possibility of Objection and Elimination</h3>
            <p className="text-muted-foreground">
              Cookies are stored on the user's computer and transmitted from it to our site. Therefore, you as a user also have full control over the use of cookies. By changing the settings in your Internet browser, you can disable or restrict the storage of cookies. Cookies that have already been stored can be deleted at any time. This can also be done automatically. If cookies are deactivated for our website, it may no longer be possible to use all functions of the website in full.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">5. Third-Party Cookies</h3>
            <p className="text-muted-foreground">
              We also use third-party cookies on our website. In detail, the following cookie-based tools are used in this context.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">6. Consent Management Tool</h3>
            <p className="text-muted-foreground">
              This website uses a consent management tool to control cookies. The consent tool enables users of our website to give consent to certain data processing procedures or to revoke consent they have given. By confirming the "Accept" button or by saving individual cookie settings, you consent to the use of the associated cookies. This action constitutes consent within the meaning of Art. 6 para. 1 lit. a GDPR.
            </p>
            <p className="text-muted-foreground mt-4">
              The consent management tool processes the following data of the website visitor: IP address, unique ID, the cookie consent text file of the respective user, and information on the user's device and browser. The legal basis for the data processing is Art. 6 para. 1 lit. f GDPR. Our legitimate interest is to design the consent management centrally and clearly and to offer the website visitor the website presence only insofar as they have given their consent to the processing of personal data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">IV. Course Registration and Learning Platform</h2>
            
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">1. Description and Scope of Data Processing</h3>
            <p className="text-muted-foreground">
              On our website, there is the possibility to register for courses and access our learning platform. When registering, the data from the input mask will be transmitted to us. In addition, the following data is collected and stored during registration:
            </p>
            <ol className="list-decimal list-inside text-muted-foreground mt-2 space-y-1">
              <li>IP address of the calling computer</li>
              <li>Date and time of registration</li>
              <li>Course progress and completion data</li>
              <li>Certificates earned</li>
            </ol>
            <p className="text-muted-foreground mt-4">
              For the processing of data, reference is made to this privacy policy during the registration process.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2. Legal Basis for Data Processing</h3>
            <p className="text-muted-foreground">
              The legal basis for the processing of data after registration for courses by the user is Art. 6 para. 1 lit. b GDPR and Art. 6 para. 1 lit. f GDPR.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">3. Purpose of Data Processing</h3>
            <p className="text-muted-foreground">
              The collection of the user's personal data as part of the registration process serves to process the contract regarding participation in courses and use of the learning platform. The data collection also serves us to track learning progress, issue certificates, and provide personalized learning experiences.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4. Duration of Storage</h3>
            <p className="text-muted-foreground">
              The data is deleted as soon as it is no longer required to achieve the purpose for which it was collected, i.e., usually upon account deletion or upon receipt of your objection. Certificate records may be retained for verification purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">V. Newsletter</h2>
            
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">1. Description and Scope of Data Processing</h3>
            <p className="text-muted-foreground">
              On our website, there is the possibility to subscribe to a free newsletter. When registering for the newsletter, the data from the input mask is transmitted to us:
            </p>
            <ol className="list-decimal list-inside text-muted-foreground mt-2 space-y-1">
              <li>Email address</li>
              <li>Name (optional)</li>
            </ol>
            <p className="text-muted-foreground mt-4">
              In addition, the following data is collected during registration:
            </p>
            <ol className="list-decimal list-inside text-muted-foreground mt-2 space-y-1">
              <li>IP address of the calling computer</li>
              <li>Date and time of registration</li>
            </ol>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2. Legal Basis for Data Processing</h3>
            <p className="text-muted-foreground">
              The legal basis for the processing of data after registration for the newsletter by the user is Art. 6 para. 1 lit. a GDPR if the user has given their consent.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">3. Purpose of Data Processing</h3>
            <p className="text-muted-foreground">
              The collection of the user's email address is used to deliver the newsletter containing updates about courses, mentorship opportunities, and tech industry news.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4. Duration of Storage</h3>
            <p className="text-muted-foreground">
              The data is deleted as soon as it is no longer required to achieve the purpose for which it was collected. Accordingly, the user's email address will be stored as long as the subscription to the newsletter is active or upon receipt of your objection.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">5. Possibility of Objection and Elimination</h3>
            <p className="text-muted-foreground">
              The subscription to the newsletter can be cancelled by the user concerned at any time. For this purpose, a corresponding link can be found in each newsletter.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">VI. Contact Form and Contact by Email</h2>
            
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">1. Description and Scope of Data Processing</h3>
            <p className="text-muted-foreground">
              Our website contains contact information that can be used for electronic contact. If a user takes advantage of this option, the data entered will be transmitted to us and stored. The following data is also stored at the time the message is sent:
            </p>
            <ol className="list-decimal list-inside text-muted-foreground mt-2 space-y-1">
              <li>The IP address of the user</li>
              <li>Date and time of the message</li>
            </ol>
            <p className="text-muted-foreground mt-4">
              You can also contact us via the email address provided. In this case, the personal data of the user transmitted with the email will be stored.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2. Legal Basis for Data Processing</h3>
            <p className="text-muted-foreground">
              The legal basis for the processing of the user's contact data is Art. 6 para. 1 lit. f GDPR.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">3. Purpose of Data Processing</h3>
            <p className="text-muted-foreground">
              The processing of the user's contact data serves us solely to process the contact.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4. Duration of Storage</h3>
            <p className="text-muted-foreground">
              The data is deleted as soon as it is no longer required to achieve the purpose for which it was collected. This is the case when it can be inferred from the circumstances that the matter concerned has been conclusively clarified.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">5. Possibility of Objection and Removal</h3>
            <p className="text-muted-foreground">
              The user has the possibility to revoke their consent to the processing of their personal data at any time. This can be notified by mail to{" "}
              <a href="mailto:contact@acloudforeveryone.org" className="text-primary hover:underline">
                contact@acloudforeveryone.org
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">VII. Recipients of Data and Transmission</h2>
            <p className="text-muted-foreground">
              Within A Cloud for Everyone, access to your data is granted to those offices that require it in order to fulfill our contractual and legal obligations. Service providers and vicarious agents employed by us (e.g., technical service providers) may also receive data for these purposes. We may transfer your personal data to companies affiliated with us, insofar as this is permissible within the scope of the purposes and legal bases stated in this data protection information. We have concluded a Data Processing Agreement with our service providers in accordance with Art. 28 GDPR.
            </p>
            <p className="text-muted-foreground mt-4">
              In the course of using our website, your personal data may be transferred outside the European Economic Area (EEA). Such processing is only carried out to fulfill contractual and business obligations and to maintain your business relationship with us.
            </p>
            <p className="text-muted-foreground mt-4">
              In the USA, the level of data protection may not be consistently high due to a lack of legal provisions that meet the requirements of the GDPR. However, we ensure that data protection is sufficiently guaranteed through standard contractual clauses of the European Commission for the protection of personal data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">VIII. Rights of the Data Subject</h2>
            <p className="text-muted-foreground">
              In accordance with Art. 15 para. 1 GDPR, you have the right to request information free of charge about the personal data we have stored about you. In addition, you have a right to correction (Art. 16 GDPR), deletion (Art. 17 GDPR), restriction of processing (Art. 18 GDPR), and data transfer (Art. 20 GDPR) of your personal data if the legal requirements are met.
            </p>
            <p className="text-muted-foreground mt-4">
              If the data processing is based on Art. 6 para. 1 lit. e or f) GDPR, you have the right to object according to Art. 21 GDPR. If you object to data processing, this will not take place in the future unless the controller can demonstrate compelling legitimate grounds for further processing that outweigh the interest of the data subject in objecting.
            </p>
            <p className="text-muted-foreground mt-4">
              In the aforementioned cases, in the event of unanswered questions, or in the event of complaints, please contact the data protection officer in writing or by email using the contact details provided above. You also have the right to lodge a complaint with a data protection supervisory authority. The data protection supervisory authority of the United Kingdom is responsible.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">IX. Automated Decision Making/Profiling</h2>
            <p className="text-muted-foreground">
              We do not use automated decision making or profiling (an automated analysis of your personal circumstances).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">X. Amendment of this Privacy Notice</h2>
            <p className="text-muted-foreground">
              This privacy policy is currently valid and has the status of December 2025.
            </p>
            <p className="text-muted-foreground mt-4">
              Due to the further development of our website and offers on it or due to changed legal or regulatory requirements, it may become necessary to change this privacy policy.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};
