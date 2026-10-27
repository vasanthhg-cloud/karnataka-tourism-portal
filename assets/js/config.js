/* Site configuration.
 *
 * KT_OTP_API — URL of the OTP service that sends the SMS and verifies the code.
 * Deploy otp-service/ (Cloudflare Worker, free tier) and paste its URL here,
 * for example:
 *
 *     window.KT_OTP_API = "https://karnataka-otp.yourname.workers.dev";
 *
 * While this is empty, mobile sign-in stays switched off: the site will not
 * invent or display an OTP, and booking remains closed.
 */
window.KT_OTP_API = "";
