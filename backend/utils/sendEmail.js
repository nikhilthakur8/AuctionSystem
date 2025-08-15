const sgMail = require("@sendgrid/mail");
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail({ to, subject, text, html, attachments }) {
	try {
		const msg = {
			to,
			from: process.env.FROM_EMAIL,
			subject,
			text,
			html,
		};

		if (
			attachments &&
			Array.isArray(attachments) &&
			attachments.length > 0
		) {
			msg.attachments = attachments;
		}

		await sgMail.send(msg);
		console.log("Email sent successfully to", to);
	} catch (error) {
		console.error("Error sending email:", error);
		if (error.response) {
			console.error(error.response.body);
		}
	}
}

module.exports = sendEmail;
