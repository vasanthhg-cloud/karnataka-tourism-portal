# -*- coding: utf-8 -*-
"""Build the static website from the Karnataka tourism dataset.

Reads : data/seed.json and data/translations/*.json (shipped with this folder),
writes: index.html, destinations.html, destination.html, homestays.html,
        homestay.html, guides.html, experiences.html, map.html, bookings.html,
        pay.html, booking.html, ticket.html, about.html, contact.html,
        assets/js/data.js, assets/js/i18n.js
"""
import json
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
D_HQ, D_REGION = {}, {}
SRC = os.path.join(HERE, "..", "karnataka-tourism")
# Prefer the copy that ships with the site so the build works on its own.
SEED_PATH = (os.path.join(HERE, "data", "seed.json") if os.path.exists(os.path.join(HERE, "data", "seed.json"))
             else os.path.join(SRC, "data", "seed.json"))
TR_DIR = (os.path.join(HERE, "data", "translations") if os.path.isdir(os.path.join(HERE, "data", "translations"))
          else os.path.join(SRC, "data", "translations"))
SEED = json.load(open(SEED_PATH, encoding="utf-8"))

EXTRA = {
    "en": {
        "common.details": "Details",
        "auth.title": "Verify your mobile number",
        "auth.intro": "Enter your mobile number. We generate one one-time code, valid for 5 minutes, and it can be used once.",
        "auth.mobile": "Mobile number",
        "auth.send": "Send OTP",
        "auth.resend": "Send a new OTP",
        "auth.resend_in": "Resend in",
        "auth.enter": "Enter the 6-digit OTP",
        "auth.verify": "Verify and continue",
        "auth.valid_for": "valid for",
        "auth.minutes": "minutes",
        "auth.expires_in": "Expires in",
        "auth.resent": "A new OTP has been generated — the previous code no longer works.",
        "auth.expired": "That OTP has expired. Request a new one.",
        "auth.account_title": "Sign in or register",
        "auth.signin_title": "Sign in",
        "auth.create_title": "Create your account",
        "auth.create_account": "Create account",
        "auth.cred_intro": "Sign in with your mobile number and password.",
        "auth.password": "Password",
        "auth.password_rule": "At least 6 characters.",
        "auth.err_name": "Please enter your name.",
        "auth.err_password": "Use at least 6 characters for the password.",
        "auth.err_exists": "An account already exists for this number. Please sign in.",
        "auth.err_no_account": "No account for this number yet — create one.",
        "auth.err_wrong_password": "That password does not match this number.",
        "auth.err_generic": "Something went wrong. Please try again.",
        "auth.use_otp": "Use an OTP instead",
        "auth.use_password": "Use a password instead",
        "auth.otp_title": "Sign in with a one-time code",
        "auth.working": "Please wait…",
        "auth.welcome": "Signed in",
        "auth.storage_note": "Accounts on this site are stored in this browser only.",
        "auth.signin": "Sign in",
        "auth.signout": "Sign out",
        "auth.account": "Your account",
        "auth.verified": "Mobile verified",
        "auth.gate_note": "Booking needs an account: sign in with your mobile number and password, or create one in a few seconds. Browsing stays open to everyone.",
        "auth.cooldown": "Please wait",
        "auth.no_active": "No active OTP for this number. Request a new one.",
        "auth.locked": "Too many wrong attempts. Request a new OTP.",
        "auth.wrong": "Incorrect OTP.",
        "auth.left": "attempts left",
        "auth.demo_mode": "Demo mode — no SMS gateway connected",
        "auth.demo_body": "Your code is",
        "auth.demo_note_short": "Demo mode: this site has no server, so the code appears here instead of arriving by SMS. One code at a time, valid 5 minutes, and a new request cancels the old one. Set the OTP service URL in config.js to send real SMS.",
        "auth.sending": "Sending…",
        "auth.verifying": "Verifying…",
        "auth.verified_title": "Mobile verified",
        "auth.err_mobile": "Enter a valid 10-digit Indian mobile number.",
        "auth.send_failed": "We could not send the SMS just now. Please try again in a moment.",
        "auth.network": "Could not reach the verification service. Check your connection and try again.",
        "auth.not_configured": "Mobile sign-in is not connected yet: this site needs the OTP service deployed and its URL set in assets/js/config.js. Nothing is shown on screen instead of an SMS — the code only ever goes to your phone.",
        "auth.sent_title": "OTP sent to",
        "auth.sent_body": "Valid for 5 minutes. Enter it below.",
        "auth.resent_title": "New OTP sent",
        "auth.verify_failed": "Could not verify",
        "auth.demo_sms": "Simulated SMS — demo build",
        "auth.demo_body": "Your OTP is",
        "auth.demo_note": "The OTP is sent to your phone by SMS — it is never displayed on this page. Only one OTP is active at a time, it expires after 5 minutes, and requesting a new one cancels the previous code.",
        "auth.gate_note": "Booking needs an account: sign in with your mobile number and password, or create one in a few seconds. Browsing stays open to everyone.",
        "auth.signin": "Sign in",
        "auth.signout": "Sign out",
        "auth.account": "Your account",
        "auth.verified": "Mobile verified",
        "auth.account_title": "Sign in or register",
        "auth.signin_title": "Sign in",
        "auth.create_title": "Create your account",
        "auth.create_account": "Create account",
        "auth.cred_intro": "Sign in with your mobile number and password.",
        "auth.password": "Password",
        "auth.password_rule": "At least 6 characters.",
        "auth.err_name": "Please enter your name.",
        "auth.err_password": "Use at least 6 characters for the password.",
        "auth.err_exists": "An account already exists for this number. Please sign in.",
        "auth.err_no_account": "No account for this number yet — create one.",
        "auth.err_wrong_password": "That password does not match this number.",
        "auth.err_generic": "Something went wrong. Please try again.",
        "auth.use_otp": "Use an OTP instead",
        "auth.use_password": "Use a password instead",
        "auth.otp_title": "Sign in with a one-time code",
        "auth.working": "Please wait…",
        "auth.welcome": "Signed in",
        "auth.storage_note": "Accounts on this site are stored in this browser only.",
        "common.source": "Source",
        "common.district_est": "district estimated from coordinates",
        "common.no_ticket": "No ticket is required for this site. Timings and closures change — check locally before travelling.",
        "booking.err_name": "Please enter your name.",
        "booking.err_email": "Please enter a valid email address.",
        "booking.err_qty": "Choose between 1 and 20 tickets.",
        "booking.err_dates": "Check-out must be after check-in, and dates cannot be in the past.",
        "booking.err_guests": "This property accepts 1 to {n} guests.",
        "booking.not_found": "That booking reference was not found on this device. Bookings are stored in this browser only.",
        "my.cancel_confirm": "Cancel this demo booking?",
        "my.note": "Bookings on this site are stored in this browser only. They are demonstration records, not reservations.",
        "ticket.print": "Print / Save as PDF",
        "ticket.stay_title": "Stay confirmation (demo)",
        "ticket.qr_note": "Demo QR — booking reference only",
        "ticket.terms": "Demonstration document only. Not valid for entry and not a reservation. No payment has been taken.",
        "ticket.only_confirmed": "A ticket becomes available once the demo payment has succeeded.",
        "contact.demo_note": "This is a demonstration website. The form does not send anything anywhere — nothing is stored.",
        "site.note": "Static website build · no server, no payment gateway · bookings are stored in your browser",
    },
    "hi": {
        "common.details": "विवरण",
        "auth.title": "अपना मोबाइल नंबर सत्यापित करें",
        "auth.intro": "अपना मोबाइल नंबर दर्ज करें। हम एक ओटीपी बनाते हैं, जो 5 मिनट तक मान्य रहता है और एक ही बार उपयोग हो सकता है।",
        "auth.mobile": "मोबाइल नंबर",
        "auth.send": "ओटीपी भेजें",
        "auth.resend": "नया ओटीपी भेजें",
        "auth.resend_in": "पुनः भेजें",
        "auth.enter": "6 अंकों का ओटीपी दर्ज करें",
        "auth.verify": "सत्यापित करें और आगे बढ़ें",
        "auth.valid_for": "मान्य",
        "auth.minutes": "मिनट",
        "auth.expires_in": "समाप्त होने में",
        "auth.resent": "नया ओटीपी बनाया गया — पिछला कोड अब काम नहीं करेगा।",
        "auth.expired": "यह ओटीपी समाप्त हो गया है। नया ओटीपी माँगें।",
        "auth.account_title": "साइन इन या पंजीकरण",
        "auth.signin_title": "साइन इन",
        "auth.create_title": "अपना खाता बनाएँ",
        "auth.create_account": "खाता बनाएँ",
        "auth.cred_intro": "अपने मोबाइल नंबर और पासवर्ड से साइन इन करें।",
        "auth.password": "पासवर्ड",
        "auth.password_rule": "कम से कम 6 अक्षर।",
        "auth.err_name": "कृपया अपना नाम दर्ज करें।",
        "auth.err_password": "पासवर्ड कम से कम 6 अक्षरों का रखें।",
        "auth.err_exists": "इस नंबर के लिए खाता पहले से है। कृपया साइन इन करें।",
        "auth.err_no_account": "इस नंबर के लिए अभी खाता नहीं है — नया बनाएँ।",
        "auth.err_wrong_password": "यह पासवर्ड इस नंबर से मेल नहीं खाता।",
        "auth.err_generic": "कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
        "auth.use_otp": "इसके बजाय ओटीपी से साइन इन करें",
        "auth.use_password": "इसके बजाय पासवर्ड से साइन इन करें",
        "auth.otp_title": "एक बार के कोड से साइन इन करें",
        "auth.working": "कृपया प्रतीक्षा करें…",
        "auth.welcome": "साइन इन हो गया",
        "auth.storage_note": "इस साइट के खाते केवल इसी ब्राउज़र में संग्रहित होते हैं।",
        "auth.signin": "साइन इन",
        "auth.signout": "साइन आउट",
        "auth.account": "आपका खाता",
        "auth.verified": "मोबाइल सत्यापित",
        "auth.gate_note": "बुकिंग के लिए खाता आवश्यक है: अपने मोबाइल नंबर और पासवर्ड से साइन इन करें, या कुछ सेकंड में खाता बनाएँ। ब्राउज़ करना सभी के लिए खुला है।",
        "auth.cooldown": "कृपया प्रतीक्षा करें",
        "auth.no_active": "इस नंबर के लिए कोई सक्रिय ओटीपी नहीं। नया माँगें।",
        "auth.locked": "बहुत अधिक गलत प्रयास। नया ओटीपी माँगें।",
        "auth.wrong": "गलत ओटीपी।",
        "auth.left": "प्रयास शेष",
        "auth.demo_mode": "डेमो मोड — कोई एसएमएस गेटवे नहीं",
        "auth.demo_body": "आपका कोड है",
        "auth.demo_note_short": "डेमो मोड: इस साइट पर सर्वर नहीं है, इसलिए कोड एसएमएस से न आकर यहाँ दिखता है। एक समय में एक कोड, 5 मिनट मान्य, नया माँगने पर पुराना रद्द। असली एसएमएस के लिए config.js में सेवा URL सेट करें।",
        "auth.sending": "भेजा जा रहा है…",
        "auth.verifying": "सत्यापित हो रहा है…",
        "auth.verified_title": "मोबाइल सत्यापित",
        "auth.err_mobile": "मान्य 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें।",
        "auth.send_failed": "अभी एसएमएस नहीं भेजा जा सका। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
        "auth.network": "सत्यापन सेवा तक नहीं पहुँच सके। कनेक्शन जाँचें और पुनः प्रयास करें।",
        "auth.not_configured": "मोबाइल साइन-इन अभी जुड़ा नहीं है: इस साइट को ओटीपी सेवा की आवश्यकता है, जिसका URL assets/js/config.js में सेट करना होगा। स्क्रीन पर ओटीपी नहीं दिखाया जाता — कोड केवल आपके फ़ोन पर जाता है।",
        "auth.sent_title": "ओटीपी भेजा गया",
        "auth.sent_body": "5 मिनट तक मान्य। नीचे दर्ज करें।",
        "auth.resent_title": "नया ओटीपी भेजा गया",
        "auth.verify_failed": "सत्यापन नहीं हो सका",
        "auth.demo_sms": "सिम्युलेटेड एसएमएस — डेमो बिल्ड",
        "auth.demo_body": "आपका ओटीपी है",
        "auth.demo_note": "यह स्टैटिक होस्ट पर एक डेमो बिल्ड है: कोई एसएमएस नहीं भेजा जाता, इसलिए कोड यहाँ दिखाई देता है। एक समय में केवल एक ओटीपी सक्रिय रहता है, 5 मिनट में समाप्त होता है, और नया माँगने पर पुराना रद्द हो जाता है।",
        "auth.gate_note": "बुकिंग के लिए खाता आवश्यक है: अपने मोबाइल नंबर और पासवर्ड से साइन इन करें, या कुछ सेकंड में खाता बनाएँ। ब्राउज़ करना सभी के लिए खुला है।",
        "auth.signin": "साइन इन",
        "auth.signout": "साइन आउट",
        "auth.account": "आपका खाता",
        "auth.verified": "मोबाइल सत्यापित",
        "auth.account_title": "साइन इन या पंजीकरण",
        "auth.signin_title": "साइन इन",
        "auth.create_title": "अपना खाता बनाएँ",
        "auth.create_account": "खाता बनाएँ",
        "auth.cred_intro": "अपने मोबाइल नंबर और पासवर्ड से साइन इन करें।",
        "auth.password": "पासवर्ड",
        "auth.password_rule": "कम से कम 6 अक्षर।",
        "auth.err_name": "कृपया अपना नाम दर्ज करें।",
        "auth.err_password": "पासवर्ड कम से कम 6 अक्षरों का रखें।",
        "auth.err_exists": "इस नंबर के लिए खाता पहले से है। कृपया साइन इन करें।",
        "auth.err_no_account": "इस नंबर के लिए अभी खाता नहीं है — नया बनाएँ।",
        "auth.err_wrong_password": "यह पासवर्ड इस नंबर से मेल नहीं खाता।",
        "auth.err_generic": "कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
        "auth.use_otp": "इसके बजाय ओटीपी से साइन इन करें",
        "auth.use_password": "इसके बजाय पासवर्ड से साइन इन करें",
        "auth.otp_title": "एक बार के कोड से साइन इन करें",
        "auth.working": "कृपया प्रतीक्षा करें…",
        "auth.welcome": "साइन इन हो गया",
        "auth.storage_note": "इस साइट के खाते केवल इसी ब्राउज़र में संग्रहित होते हैं।",
        "common.source": "स्रोत",
        "common.district_est": "जिला निर्देशांकों से अनुमानित",
        "common.no_ticket": "इस स्थल के लिए टिकट आवश्यक नहीं है। समय और बंद होने की तिथियाँ बदलती रहती हैं — यात्रा से पहले स्थानीय रूप से पुष्टि करें।",
        "booking.err_name": "कृपया अपना नाम दर्ज करें।",
        "booking.err_email": "कृपया मान्य ईमेल पता दर्ज करें।",
        "booking.err_qty": "1 से 20 टिकट के बीच चुनें।",
        "booking.err_dates": "चेक-आउट चेक-इन के बाद होना चाहिए और तारीखें बीती हुई नहीं हो सकतीं।",
        "booking.err_guests": "यह संपत्ति 1 से {n} मेहमान स्वीकार करती है।",
        "booking.not_found": "यह बुकिंग संदर्भ इस डिवाइस पर नहीं मिला। बुकिंग केवल इसी ब्राउज़र में संग्रहित होती हैं।",
        "my.cancel_confirm": "यह डेमो बुकिंग रद्द करें?",
        "my.note": "इस साइट की बुकिंग केवल इसी ब्राउज़र में संग्रहित होती हैं। ये प्रदर्शन रिकॉर्ड हैं, आरक्षण नहीं।",
        "ticket.print": "प्रिंट करें / PDF के रूप में सहेजें",
        "ticket.stay_title": "ठहरने की पुष्टि (डेमो)",
        "ticket.qr_note": "डेमो QR — केवल बुकिंग संदर्भ",
        "ticket.terms": "केवल प्रदर्शन दस्तावेज़। प्रवेश के लिए मान्य नहीं और आरक्षण नहीं। कोई भुगतान नहीं लिया गया।",
        "ticket.only_confirmed": "डेमो भुगतान सफल होने के बाद ही टिकट उपलब्ध होता है।",
        "contact.demo_note": "यह एक प्रदर्शन वेबसाइट है। यह फ़ॉर्म कहीं कुछ नहीं भेजता — कुछ भी संग्रहित नहीं होता।",
        "site.note": "स्टैटिक वेबसाइट बिल्ड · कोई सर्वर नहीं, कोई भुगतान गेटवे नहीं · बुकिंग आपके ब्राउज़र में संग्रहित होती हैं",
    },
    "kn": {
        "common.details": "ವಿವರಗಳು",
        "auth.title": "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಪರಿಶೀಲಿಸಿ",
        "auth.intro": "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ. ನಾವು ಒಂದು ಒಟಿಪಿ ರಚಿಸುತ್ತೇವೆ, ಅದು 5 ನಿಮಿಷ ಮಾನ್ಯವಾಗಿರುತ್ತದೆ ಮತ್ತು ಒಮ್ಮೆ ಮಾತ್ರ ಬಳಸಬಹುದು.",
        "auth.mobile": "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
        "auth.send": "ಒಟಿಪಿ ಕಳುಹಿಸಿ",
        "auth.resend": "ಹೊಸ ಒಟಿಪಿ ಕಳುಹಿಸಿ",
        "auth.resend_in": "ಮತ್ತೆ ಕಳುಹಿಸಲು",
        "auth.enter": "6 ಅಂಕಿಯ ಒಟಿಪಿ ನಮೂದಿಸಿ",
        "auth.verify": "ಪರಿಶೀಲಿಸಿ ಮುಂದುವರಿಸಿ",
        "auth.valid_for": "ಮಾನ್ಯ",
        "auth.minutes": "ನಿಮಿಷ",
        "auth.expires_in": "ಮುಗಿಯಲು",
        "auth.resent": "ಹೊಸ ಒಟಿಪಿ ರಚಿಸಲಾಗಿದೆ — ಹಳೆಯ ಕೋಡ್ ಇನ್ನು ಕೆಲಸ ಮಾಡುವುದಿಲ್ಲ.",
        "auth.expired": "ಈ ಒಟಿಪಿ ಅವಧಿ ಮುಗಿದಿದೆ. ಹೊಸದನ್ನು ಕೇಳಿ.",
        "auth.account_title": "ಸೈನ್ ಇನ್ ಅಥವಾ ನೋಂದಣಿ",
        "auth.signin_title": "ಸೈನ್ ಇನ್",
        "auth.create_title": "ನಿಮ್ಮ ಖಾತೆ ರಚಿಸಿ",
        "auth.create_account": "ಖಾತೆ ರಚಿಸಿ",
        "auth.cred_intro": "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್‌ನಿಂದ ಸೈನ್ ಇನ್ ಮಾಡಿ.",
        "auth.password": "ಪಾಸ್‌ವರ್ಡ್",
        "auth.password_rule": "ಕನಿಷ್ಠ 6 ಅಕ್ಷರಗಳು.",
        "auth.err_name": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರು ನಮೂದಿಸಿ.",
        "auth.err_password": "ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 6 ಅಕ್ಷರ ಇರಬೇಕು.",
        "auth.err_exists": "ಈ ಸಂಖ್ಯೆಗೆ ಖಾತೆ ಈಗಾಗಲೇ ಇದೆ. ದಯವಿಟ್ಟು ಸೈನ್ ಇನ್ ಮಾಡಿ.",
        "auth.err_no_account": "ಈ ಸಂಖ್ಯೆಗೆ ಇನ್ನೂ ಖಾತೆ ಇಲ್ಲ — ಹೊಸದು ರಚಿಸಿ.",
        "auth.err_wrong_password": "ಈ ಪಾಸ್‌ವರ್ಡ್ ಈ ಸಂಖ್ಯೆಗೆ ಹೊಂದುತ್ತಿಲ್ಲ.",
        "auth.err_generic": "ಏನೋ ತಪ್ಪಾಗಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        "auth.use_otp": "ಬದಲಾಗಿ ಒಟಿಪಿ ಬಳಸಿ",
        "auth.use_password": "ಬದಲಾಗಿ ಪಾಸ್‌ವರ್ಡ್ ಬಳಸಿ",
        "auth.otp_title": "ಒಂದು ಬಾರಿಯ ಕೋಡ್‌ನಿಂದ ಸೈನ್ ಇನ್",
        "auth.working": "ದಯವಿಟ್ಟು ಕಾಯಿರಿ…",
        "auth.welcome": "ಸೈನ್ ಇನ್ ಆಗಿದೆ",
        "auth.storage_note": "ಈ ಸೈಟ್‌ನ ಖಾತೆಗಳು ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮಾತ್ರ ಸಂಗ್ರಹವಾಗುತ್ತವೆ.",
        "auth.signin": "ಸೈನ್ ಇನ್",
        "auth.signout": "ಸೈನ್ ಔಟ್",
        "auth.account": "ನಿಮ್ಮ ಖಾತೆ",
        "auth.verified": "ಮೊಬೈಲ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
        "auth.gate_note": "ಬುಕಿಂಗ್‌ಗೆ ಖಾತೆ ಬೇಕು: ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್‌ನಿಂದ ಸೈನ್ ಇನ್ ಮಾಡಿ, ಅಥವಾ ಕೆಲವೇ ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಖಾತೆ ರಚಿಸಿ. ಬ್ರೌಸ್ ಮಾಡುವುದು ಎಲ್ಲರಿಗೂ ಮುಕ್ತ.",
        "auth.cooldown": "ದಯವಿಟ್ಟು ಕಾಯಿರಿ",
        "auth.no_active": "ಈ ಸಂಖ್ಯೆಗೆ ಸಕ್ರಿಯ ಒಟಿಪಿ ಇಲ್ಲ. ಹೊಸದನ್ನು ಕೇಳಿ.",
        "auth.locked": "ಹೆಚ್ಚು ತಪ್ಪು ಪ್ರಯತ್ನಗಳು. ಹೊಸ ಒಟಿಪಿ ಕೇಳಿ.",
        "auth.wrong": "ತಪ್ಪು ಒಟಿಪಿ.",
        "auth.left": "ಪ್ರಯತ್ನಗಳು ಉಳಿದಿವೆ",
        "auth.demo_mode": "ಡೆಮೊ ಮೋಡ್ — SMS ಗೇಟ್‌ವೇ ಇಲ್ಲ",
        "auth.demo_body": "ನಿಮ್ಮ ಕೋಡ್",
        "auth.demo_note_short": "ಡೆಮೊ ಮೋಡ್: ಈ ಸೈಟ್‌ನಲ್ಲಿ ಸರ್ವರ್ ಇಲ್ಲ, ಆದ್ದರಿಂದ ಕೋಡ್ SMS ಬದಲು ಇಲ್ಲಿ ಕಾಣುತ್ತದೆ. ಒಂದು ಸಮಯದಲ್ಲಿ ಒಂದು ಕೋಡ್, 5 ನಿಮಿಷ ಮಾನ್ಯ, ಹೊಸದನ್ನು ಕೇಳಿದರೆ ಹಳೆಯದು ರದ್ದು. ನಿಜವಾದ SMS ಗೆ config.js ನಲ್ಲಿ ಸೇವಾ URL ಹಾಕಿ.",
        "auth.sending": "ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ…",
        "auth.verifying": "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…",
        "auth.verified_title": "ಮೊಬೈಲ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
        "auth.err_mobile": "ಸರಿಯಾದ 10 ಅಂಕಿಯ ಭಾರತೀಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.",
        "auth.send_failed": "ಈಗ SMS ಕಳುಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಪ್ರಯತ್ನಿಸಿ.",
        "auth.network": "ಪರಿಶೀಲನಾ ಸೇವೆ ತಲುಪಲಿಲ್ಲ. ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        "auth.not_configured": "ಮೊಬೈಲ್ ಸೈನ್-ಇನ್ ಇನ್ನೂ ಸಂಪರ್ಕಗೊಂಡಿಲ್ಲ: ಈ ಸೈಟ್‌ಗೆ ಒಟಿಪಿ ಸೇವೆ ಬೇಕು, ಅದರ URL ಅನ್ನು assets/js/config.js ನಲ್ಲಿ ಹಾಕಬೇಕು. ಪರದೆಯಲ್ಲಿ ಒಟಿಪಿ ತೋರಿಸುವುದಿಲ್ಲ — ಕೋಡ್ ನಿಮ್ಮ ಫೋನ್‌ಗೆ ಮಾತ್ರ ಹೋಗುತ್ತದೆ.",
        "auth.sent_title": "ಒಟಿಪಿ ಕಳುಹಿಸಲಾಗಿದೆ",
        "auth.sent_body": "5 ನಿಮಿಷ ಮಾನ್ಯ. ಕೆಳಗೆ ನಮೂದಿಸಿ.",
        "auth.resent_title": "ಹೊಸ ಒಟಿಪಿ ಕಳುಹಿಸಲಾಗಿದೆ",
        "auth.verify_failed": "ಪರಿಶೀಲನೆ ಆಗಲಿಲ್ಲ",
        "auth.demo_sms": "ಸಿಮ್ಯುಲೇಟೆಡ್ SMS — ಡೆಮೊ ಬಿಲ್ಡ್",
        "auth.demo_body": "ನಿಮ್ಮ ಒಟಿಪಿ",
        "auth.demo_note": "ಇದು ಸ್ಟಾಟಿಕ್ ಹೋಸ್ಟ್‌ನಲ್ಲಿ ಡೆಮೊ ಬಿಲ್ಡ್: SMS ಕಳುಹಿಸುವುದಿಲ್ಲ, ಆದ್ದರಿಂದ ಕೋಡ್ ಇಲ್ಲಿ ಕಾಣುತ್ತದೆ. ಒಂದು ಸಮಯದಲ್ಲಿ ಒಂದೇ ಒಟಿಪಿ ಸಕ್ರಿಯ, 5 ನಿಮಿಷಗಳಲ್ಲಿ ಮುಗಿಯುತ್ತದೆ, ಹೊಸದನ್ನು ಕೇಳಿದರೆ ಹಳೆಯದು ರದ್ದಾಗುತ್ತದೆ.",
        "auth.gate_note": "ಬುಕಿಂಗ್‌ಗೆ ಖಾತೆ ಬೇಕು: ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್‌ನಿಂದ ಸೈನ್ ಇನ್ ಮಾಡಿ, ಅಥವಾ ಕೆಲವೇ ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಖಾತೆ ರಚಿಸಿ. ಬ್ರೌಸ್ ಮಾಡುವುದು ಎಲ್ಲರಿಗೂ ಮುಕ್ತ.",
        "auth.signin": "ಸೈನ್ ಇನ್",
        "auth.signout": "ಸೈನ್ ಔಟ್",
        "auth.account": "ನಿಮ್ಮ ಖಾತೆ",
        "auth.verified": "ಮೊಬೈಲ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
        "auth.account_title": "ಸೈನ್ ಇನ್ ಅಥವಾ ನೋಂದಣಿ",
        "auth.signin_title": "ಸೈನ್ ಇನ್",
        "auth.create_title": "ನಿಮ್ಮ ಖಾತೆ ರಚಿಸಿ",
        "auth.create_account": "ಖಾತೆ ರಚಿಸಿ",
        "auth.cred_intro": "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್‌ನಿಂದ ಸೈನ್ ಇನ್ ಮಾಡಿ.",
        "auth.password": "ಪಾಸ್‌ವರ್ಡ್",
        "auth.password_rule": "ಕನಿಷ್ಠ 6 ಅಕ್ಷರಗಳು.",
        "auth.err_name": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರು ನಮೂದಿಸಿ.",
        "auth.err_password": "ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 6 ಅಕ್ಷರ ಇರಬೇಕು.",
        "auth.err_exists": "ಈ ಸಂಖ್ಯೆಗೆ ಖಾತೆ ಈಗಾಗಲೇ ಇದೆ. ದಯವಿಟ್ಟು ಸೈನ್ ಇನ್ ಮಾಡಿ.",
        "auth.err_no_account": "ಈ ಸಂಖ್ಯೆಗೆ ಇನ್ನೂ ಖಾತೆ ಇಲ್ಲ — ಹೊಸದು ರಚಿಸಿ.",
        "auth.err_wrong_password": "ಈ ಪಾಸ್‌ವರ್ಡ್ ಈ ಸಂಖ್ಯೆಗೆ ಹೊಂದುತ್ತಿಲ್ಲ.",
        "auth.err_generic": "ಏನೋ ತಪ್ಪಾಗಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        "auth.use_otp": "ಬದಲಾಗಿ ಒಟಿಪಿ ಬಳಸಿ",
        "auth.use_password": "ಬದಲಾಗಿ ಪಾಸ್‌ವರ್ಡ್ ಬಳಸಿ",
        "auth.otp_title": "ಒಂದು ಬಾರಿಯ ಕೋಡ್‌ನಿಂದ ಸೈನ್ ಇನ್",
        "auth.working": "ದಯವಿಟ್ಟು ಕಾಯಿರಿ…",
        "auth.welcome": "ಸೈನ್ ಇನ್ ಆಗಿದೆ",
        "auth.storage_note": "ಈ ಸೈಟ್‌ನ ಖಾತೆಗಳು ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮಾತ್ರ ಸಂಗ್ರಹವಾಗುತ್ತವೆ.",
        "common.source": "ಮೂಲ",
        "common.district_est": "ಜಿಲ್ಲೆ ನಿರ್ದೇಶಾಂಕಗಳಿಂದ ಅಂದಾಜಿಸಲಾಗಿದೆ",
        "common.no_ticket": "ಈ ತಾಣಕ್ಕೆ ಟಿಕೆಟ್ ಅಗತ್ಯವಿಲ್ಲ. ಸಮಯ ಮತ್ತು ಮುಚ್ಚುವ ದಿನಗಳು ಬದಲಾಗುತ್ತವೆ — ಪ್ರಯಾಣಕ್ಕೆ ಮೊದಲು ಸ್ಥಳೀಯವಾಗಿ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
        "booking.err_name": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರು ನಮೂದಿಸಿ.",
        "booking.err_email": "ದಯವಿಟ್ಟು ಸರಿಯಾದ ಇಮೇಲ್ ವಿಳಾಸ ನಮೂದಿಸಿ.",
        "booking.err_qty": "1 ರಿಂದ 20 ಟಿಕೆಟ್‌ಗಳ ನಡುವೆ ಆಯ್ಕೆಮಾಡಿ.",
        "booking.err_dates": "ಚೆಕ್-ಔಟ್ ಚೆಕ್-ಇನ್ ನಂತರ ಇರಬೇಕು ಮತ್ತು ದಿನಾಂಕಗಳು ಕಳೆದದ್ದಾಗಿರಬಾರದು.",
        "booking.err_guests": "ಈ ಆಸ್ತಿ 1 ರಿಂದ {n} ಅತಿಥಿಗಳನ್ನು ಸ್ವೀಕರಿಸುತ್ತದೆ.",
        "booking.not_found": "ಈ ಬುಕಿಂಗ್ ಉಲ್ಲೇಖ ಈ ಸಾಧನದಲ್ಲಿ ಕಂಡುಬಂದಿಲ್ಲ. ಬುಕಿಂಗ್‌ಗಳು ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮಾತ್ರ ಸಂಗ್ರಹವಾಗುತ್ತವೆ.",
        "my.cancel_confirm": "ಈ ಡೆಮೊ ಬುಕಿಂಗ್ ರದ್ದುಮಾಡಬೇಕೇ?",
        "my.note": "ಈ ಸೈಟ್‌ನ ಬುಕಿಂಗ್‌ಗಳು ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮಾತ್ರ ಸಂಗ್ರಹವಾಗುತ್ತವೆ. ಇವು ಪ್ರದರ್ಶನ ದಾಖಲೆಗಳು, ಕಾಯ್ದಿರಿಸುವಿಕೆಗಳಲ್ಲ.",
        "ticket.print": "ಮುದ್ರಿಸಿ / PDF ಆಗಿ ಉಳಿಸಿ",
        "ticket.stay_title": "ವಸತಿ ದೃಢೀಕರಣ (ಡೆಮೊ)",
        "ticket.qr_note": "ಡೆಮೊ QR — ಬುಕಿಂಗ್ ಉಲ್ಲೇಖ ಮಾತ್ರ",
        "ticket.terms": "ಪ್ರದರ್ಶನ ದಾಖಲೆ ಮಾತ್ರ. ಪ್ರವೇಶಕ್ಕೆ ಮಾನ್ಯವಲ್ಲ ಮತ್ತು ಕಾಯ್ದಿರಿಸುವಿಕೆ ಅಲ್ಲ. ಯಾವುದೇ ಪಾವತಿ ತೆಗೆದುಕೊಂಡಿಲ್ಲ.",
        "ticket.only_confirmed": "ಡೆಮೊ ಪಾವತಿ ಯಶಸ್ವಿಯಾದ ನಂತರವೇ ಟಿಕೆಟ್ ಲಭ್ಯವಾಗುತ್ತದೆ.",
        "contact.demo_note": "ಇದು ಪ್ರದರ್ಶನ ವೆಬ್‌ಸೈಟ್. ಈ ಫಾರ್ಮ್ ಎಲ್ಲಿಗೂ ಏನನ್ನೂ ಕಳುಹಿಸುವುದಿಲ್ಲ — ಏನೂ ಸಂಗ್ರಹವಾಗುವುದಿಲ್ಲ.",
        "site.note": "ಸ್ಟಾಟಿಕ್ ವೆಬ್‌ಸೈಟ್ ಬಿಲ್ಡ್ · ಸರ್ವರ್ ಇಲ್ಲ, ಪಾವತಿ ಗೇಟ್‌ವೇ ಇಲ್ಲ · ಬುಕಿಂಗ್‌ಗಳು ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ",
    },
}

NAV = [
    ("index.html", "nav.home", "home"),
    ("destinations.html", "nav.destinations", "destinations"),
    ("homestays.html", "nav.homestays", "homestays"),
    ("guides.html", "nav.guides", "guides"),
    ("experiences.html", "nav.experiences", "experiences"),
    ("map.html", "nav.map", "map"),
    ("bookings.html", "nav.bookings", "bookings"),
    ("about.html", "nav.about", "about"),
    ("contact.html", "nav.contact", "contact"),
]


def build_data():
    global D_HQ, D_REGION
    D_HQ = {d["id"]: d["headquarters"] for d in SEED["districts"]}
    D_REGION = {d["id"]: d.get("region") for d in SEED["districts"]}
    districts = []
    for d in SEED["districts"]:
        districts.append({"id": d["id"], "name": d["name"], "region": d.get("region"),
                          "headquarters": d["headquarters"]})
    dests = []
    for i, d in enumerate(SEED["destinations"], start=1):
        dests.append({
            "id": i, "name": d["name"], "district": d["district"], "districtId": d["district_id"],
            "headquarters": D_HQ.get(d["district_id"], ""), "region": D_REGION.get(d["district_id"], ""),
            "category": d["category"], "lat": d["lat"], "lon": d["lon"],
            "coord_source": d.get("coord_source"), "description": d["description"],
            "fee_note": d["fee_note"], "hours": d["hours"], "season": d["season"],
            "facilities": d["facilities"], "accessibility": d["accessibility"],
            "demo_price": d["demo_price"], "bookable": bool(d["bookable"]),
            "photos": [{"url": p["url"], "credit": p["credit"], "license": p["license"]}
                       for p in d["photos"]],
            "source": d.get("source") or "curated",
            "article": d.get("article") or "",
            "district_source": d.get("district_source") or "",
        })
    homes = []
    for h in SEED["homestays"]:
        homes.append({
            "id": h["id"], "name": h["name"], "district": h["district"],
            "districtId": h["district_id"], "address": h["address"], "location": h["location"],
            "lat": h["lat"], "lon": h["lon"], "description": h["description"],
            "nearby": h["nearby"], "room_types": h["room_types"].split("|"),
            "amenities": [a.strip() for a in h["amenities"].split(",") if a.strip()],
            "checkin": h["checkin"], "checkout": h["checkout"], "house_rules": h["house_rules"],
            "price": h["price_per_night"], "max_guests": h["max_guests"],
            "cancellation": h["cancellation"], "host_name": h["host_name"],
            "host_phone": h["host_phone"], "rating": h["rating"], "reviews": h["reviews"],
            "photos": [{"url": p["url"], "credit": p["credit"], "license": p["license"]}
                       for p in h["photos"]],
        })
    guides = [{"id": g["id"], "name": g["name"], "district": g["district"],
               "districtId": g["district_id"], "languages": g["languages"],
               "specialities": g["specialities"], "years": g["experience_years"],
               "day_rate": g["day_rate"], "bio": g["bio"], "rating": g["rating"]}
              for g in SEED["guides"]]
    exps = [{"id": e["id"], "name": e["name"], "district": e["district"],
             "districtId": e["district_id"], "description": e["description"],
             "duration": e["duration"], "price": e["demo_price"]} for e in SEED["experiences"]]
    cats = sorted({d["category"] for d in dests})
    payload = {"districts": districts, "destinations": dests, "homestays": homes,
               "guides": guides, "experiences": exps, "categories": cats}
    with open(os.path.join(HERE, "assets", "js", "data.js"), "w", encoding="utf-8") as f:
        f.write("/* Karnataka tourism dataset - generated by build_site.py.\n"
                "   Destinations: names, descriptions and coordinates compiled from public\n"
                "   sources; coordinates geocoded against OpenStreetMap where available.\n"
                "   Photographs: Wikimedia Commons, credited per image. Homestays, guides and\n"
                "   experiences are DEMONSTRATION listings (is_demo) - not real businesses. */\n")
        f.write("window.KT_DATA = ")
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    # content translations keyed by destination id
    content = {}
    path = os.path.join(TR_DIR, "content.json")
    if os.path.exists(path):
        for row in json.load(open(path, encoding="utf-8")):
            if row["target_kind"] != "destination":
                continue
            content.setdefault(str(row["target_id"]), {})[row["lang"]] = row["value"]
    with open(os.path.join(HERE, "assets", "js", "content.js"), "w", encoding="utf-8") as f:
        f.write("/* Checked Hindi and Kannada descriptions, by destination id. */\n")
        f.write("window.KT_CONTENT = ")
        json.dump(content, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    i18n = {}
    for code in ("en", "hi", "kn"):
        base = json.load(open(os.path.join(TR_DIR, code + ".json"), encoding="utf-8"))
        base.update(EXTRA[code])
        i18n[code] = base
    with open(os.path.join(HERE, "assets", "js", "i18n.js"), "w", encoding="utf-8") as f:
        f.write("/* Interface strings: English, Hindi, Kannada. */\n")
        f.write("window.KT_I18N = ")
        json.dump(i18n, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print("data.js / content.js / i18n.js written:",
          len(dests), "destinations,", len(homes), "homestays,", len(guides), "guides")


def header(active):
    links = "".join(
        '<a href="%s" data-i18n="%s"%s>%s</a>' % (href, key, ' class="active"' if key == active else "", key)
        for href, key, page_id in NAV)
    return """
<header class="site">
  <div class="wrap topbar">
    <a class="brand" href="index.html">
      <span class="mark" aria-hidden="true">ಕ</span>
      <span><span data-i18n="app.name">Smart Local Tourism Business Portal – Karnataka</span>
      <small data-i18n="app.tagline"></small></span>
    </a>
    <nav class="main">%s</nav>
    <div class="tools">
      <select id="lang-select" data-i18n-aria="common.language" style="width:auto">
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
        <option value="kn">ಕನ್ನಡ</option>
      </select>
      <button id="theme-toggle" class="icon-btn" type="button" aria-label="Toggle theme">☾</button>
      <div id="auth-slot"></div>
    </div>
  </div>
</header>""" % links


FOOTER = """
<footer class="site">
  <div class="wrap">
    <div class="cols">
      <div>
        <div class="brand" style="margin-bottom:8px"><span class="mark" aria-hidden="true">ಕ</span>
          <span data-i18n="app.name"></span></div>
        <p class="small muted" data-i18n="footer.demo"></p>
      </div>
      <div>
        <h4 data-i18n="nav.destinations"></h4>
        <a href="destinations.html" data-i18n="nav.destinations"></a>
        <a href="homestays.html" data-i18n="nav.homestays"></a>
        <a href="guides.html" data-i18n="nav.guides"></a>
        <a href="experiences.html" data-i18n="nav.experiences"></a>
      </div>
      <div>
        <h4 data-i18n="nav.bookings"></h4>
        <a href="bookings.html" data-i18n="nav.bookings"></a>
        <a href="map.html" data-i18n="nav.map"></a>
        <a href="about.html" data-i18n="nav.about"></a>
      </div>
      <div>
        <h4 data-i18n="nav.contact"></h4>
        <a href="contact.html" data-i18n="nav.contact"></a>
        <a href="ticket.html" data-i18n="ticket.title"></a>
      </div>
    </div>
    <div class="legal">
      <span data-i18n="footer.data"></span> · <span data-i18n="common.data_note"></span><br>
      <span data-i18n="site.note"></span>
    </div>
  </div>
</footer>"""


def page(filename, page_id, title_key, body, extra_head="", extra_scripts="", title_fallback=""):
    html = """<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<meta name="description" content="District-wise tourism portal for Karnataka: destinations, homestays, guides, cultural experiences and demo ticket booking.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Kannada:wght@400;600&family=Noto+Sans+Devanagari:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌿</text></svg>">
%(head)s
</head>
<body data-page="%(page_id)s">
%(header)s
<main class="wrap">
%(body)s
</main>
%(footer)s
<script src="assets/js/data.js"></script>
<script src="assets/js/i18n.js"></script>
<script src="assets/js/content.js"></script>
<script src="assets/js/config.js"></script>
<script src="assets/js/auth.js"></script>
%(scripts)s
<script src="assets/js/app.js"></script>
</body>
</html>
""" % {
        "title": title_fallback or title_key,
        "page_id": page_id,
        "head": extra_head,
        "header": header(title_key),
        "body": body,
        "footer": FOOTER,
        "scripts": extra_scripts,
    }
    with open(os.path.join(HERE, filename), "w", encoding="utf-8") as f:
        f.write(html)


def build_pages():
    # ---------------------------------------------------------------- home
    home = """
<section class="hero">
  <img class="bg" id="hero-img" alt="" referrerpolicy="no-referrer"
       src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Mysore_Palace_illuminated.jpg/1280px-Mysore_Palace_illuminated.jpg">
  <div class="shade"></div>
  <div class="inner">
    <h1 data-i18n="hero.title"></h1>
    <p data-i18n="hero.subtitle"></p>
    <form class="searchbar" action="destinations.html" method="get" autocomplete="off" id="hero-search">
      <input type="search" name="q" data-suggest="hero-suggest" data-i18n-ph="hero.search_placeholder">
      <div class="suggest" id="hero-suggest"></div>
      <button class="btn" type="submit" data-i18n="search.title"></button>
    </form>
  </div>
  <span class="credit">Photo: Wikimedia Commons</span>
</section>

<div class="stat-row">
  <div class="stat"><b id="stat-destinations">0</b><span data-i18n="home.stat_destinations"></span></div>
  <div class="stat"><b id="stat-districts">0</b><span data-i18n="home.stat_districts"></span></div>
  <div class="stat"><b id="stat-homestays">0</b><span data-i18n="home.stat_homestays"></span></div>
  <div class="stat"><b id="stat-experiences">0</b><span data-i18n="home.stat_experiences"></span></div>
</div>

<section class="block">
  <div class="section-head"><h2 data-i18n="home.featured"></h2>
    <a class="btn sm ghost" href="destinations.html" data-i18n="home.view_all"></a></div>
  <div class="grid" id="featured"></div>
</section>

<section class="block">
  <div class="section-head"><h2 data-i18n="home.popular_homestays"></h2>
    <a class="btn sm ghost" href="homestays.html" data-i18n="home.view_all"></a></div>
  <div class="grid" id="popular"></div>
</section>

<section class="block">
  <div class="section-head"><h2 data-i18n="home.recommended"></h2>
    <a class="btn sm ghost" href="experiences.html" data-i18n="home.view_all"></a></div>
  <div class="grid" id="experiences"></div>
</section>

<section class="block">
  <div class="section-head"><h2 data-i18n="home.districts"></h2></div>
  <div class="district-list" id="district-grid"></div>
</section>

<section class="block">
  <div class="section-head"><h2 data-i18n="home.recent"></h2></div>
  <div class="grid" id="recent"></div>
</section>
"""
    page("index.html", "home", "nav.home", home,
         title_fallback="Smart Local Tourism Business Portal – Karnataka")

    # -------------------------------------------------------- destinations
    dests = """
<div class="section-head" style="margin-top:24px">
  <h1 style="font-size:1.9rem" data-i18n="nav.destinations"></h1>
  <span class="muted small" id="result-count"></span>
</div>
<form class="filters" id="filters-destinations">
  <div><label data-i18n="search.title"></label>
    <input type="search" id="f-q" data-i18n-ph="hero.search_placeholder"></div>
  <div><label data-i18n="common.district"></label><select id="f-district"></select></div>
  <div><label data-i18n="common.category"></label><select id="f-category"></select></div>
  <div><label data-i18n="common.price"></label>
    <select id="f-max">
      <option value="" data-i18n="search.any_price"></option>
      <option value="0" data-i18n="common.free"></option>
      <option value="50">≤ ₹50</option>
      <option value="100">≤ ₹100</option>
      <option value="200">≤ ₹200</option>
      <option value="500">≤ ₹500</option>
    </select></div>
  <div><label data-i18n="search.sort"></label>
    <select id="f-sort">
      <option value="" data-i18n="search.sort_popular"></option>
      <option value="name" data-i18n="search.sort_name"></option>
      <option value="price_low" data-i18n="search.sort_price_low"></option>
      <option value="price_high" data-i18n="search.sort_price_high"></option>
    </select></div>
  <div class="actions"><button class="btn" type="submit" data-i18n="search.apply"></button>
    <button class="btn ghost" type="button" id="f-clear" data-i18n="search.clear"></button></div>
</form>
<div class="grid" id="results"></div>
<div class="pager" id="pager"></div>
"""
    page("destinations.html", "destinations", "nav.destinations", dests)

    page("destination.html", "destination", "nav.destinations", '<div id="detail"></div>',
         title_fallback="Destination · Karnataka Tourism Portal")

    # ----------------------------------------------------------- homestays
    homes = """
<div class="section-head" style="margin-top:24px">
  <h1 style="font-size:1.9rem" data-i18n="nav.homestays"></h1>
  <span class="muted small" id="result-count"></span>
</div>
<div class="note" style="margin-bottom:18px" data-i18n="common.demo_note"></div>
<form class="filters" id="filters-homestays">
  <div><label data-i18n="search.title"></label><input type="search" id="f-q"></div>
  <div><label data-i18n="common.district"></label><select id="f-district"></select></div>
  <div><label data-i18n="common.guests"></label>
    <select id="f-guests"><option value="">Any</option>
      <option value="1">1+</option><option value="2">2+</option>
      <option value="3">3+</option><option value="4">4+</option></select></div>
  <div><label data-i18n="common.price"></label>
    <select id="f-max"><option value="" data-i18n="search.any_price"></option>
      <option value="2500">≤ ₹2,500</option><option value="3500">≤ ₹3,500</option>
      <option value="4500">≤ ₹4,500</option><option value="6000">≤ ₹6,000</option></select></div>
  <div><label data-i18n="common.amenities"></label>
    <select id="f-amenity"><option value="">Any</option>
      <option>Breakfast included</option><option>Wi-Fi</option><option>Parking</option>
      <option>Hot water</option><option>All meals</option><option>Farm tour</option>
      <option>Bonfire</option></select></div>
  <div><label data-i18n="search.sort"></label>
    <select id="f-sort"><option value="" data-i18n="search.sort_rating"></option>
      <option value="price_low" data-i18n="search.sort_price_low"></option>
      <option value="price_high" data-i18n="search.sort_price_high"></option>
      <option value="name" data-i18n="search.sort_name"></option></select></div>
  <div class="actions"><button class="btn" type="submit" data-i18n="search.apply"></button>
    <button class="btn ghost" type="button" id="f-clear" data-i18n="search.clear"></button></div>
</form>
<div class="grid" id="results"></div>
<div class="pager" id="pager"></div>
"""
    page("homestays.html", "homestays", "nav.homestays", homes)
    page("homestay.html", "homestay", "nav.homestays", '<div id="detail"></div>',
         title_fallback="Homestay · Karnataka Tourism Portal")

    # -------------------------------------------------------------- guides
    guides = """
<div class="section-head" style="margin-top:24px">
  <h1 style="font-size:1.9rem" data-i18n="nav.guides"></h1>
  <span class="muted small" id="result-count"></span>
</div>
<div class="note" style="margin-bottom:18px" data-i18n="common.demo_note"></div>
<form class="filters">
  <div><label data-i18n="common.district"></label><select id="f-district"></select></div>
</form>
<div class="grid" id="results"></div>
"""
    page("guides.html", "guides", "nav.guides", guides)

    exps = """
<div class="section-head" style="margin-top:24px">
  <h1 style="font-size:1.9rem" data-i18n="nav.experiences"></h1>
  <span class="muted small" id="result-count"></span>
</div>
<div class="note" style="margin-bottom:18px" data-i18n="common.demo_note"></div>
<div class="grid" id="results"></div>
"""
    page("experiences.html", "experiences", "nav.experiences", exps)

    # ----------------------------------------------------------------- map
    map_body = """
<div class="section-head" style="margin-top:24px">
  <h1 style="font-size:1.9rem" data-i18n="nav.map"></h1>
  <span class="muted small"><span id="map-count">0</span> markers</span>
</div>
<div class="map-controls">
  <div><label data-i18n="common.district"></label><select id="f-district"></select></div>
  <div><label data-i18n="common.category"></label><select id="f-category"></select></div>
  <div><label>Show</label><select id="f-kind">
    <option value="all">Destinations + homestays</option>
    <option value="destinations">Destinations only</option>
    <option value="homestays">Homestays only</option></select></div>
  <div class="actions"><button class="btn" id="apply" type="button" data-i18n="search.apply"></button></div>
</div>
<div id="map"></div>
<p class="small muted" style="margin-top:10px">
  Map data © OpenStreetMap contributors. Markers use coordinates verified against OpenStreetMap
  where available and approximate site coordinates otherwise.
</p>
"""
    page("map.html", "map", "nav.map", map_body,
         extra_head='<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">',
         extra_scripts='<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>')

    # ------------------------------------------------------------ bookings
    bookings_body = """
<div class="section-head" style="margin-top:24px">
  <h1 style="font-size:1.9rem" data-i18n="my.title"></h1>
  <div class="row">
    <button class="btn sm ghost" id="export-csv" type="button" data-i18n="my.export_csv"></button>
    <a class="btn sm ghost" href="destinations.html" data-i18n="nav.destinations"></a>
  </div>
</div>
<div class="note" style="margin-bottom:16px" data-i18n="my.note"></div>
<form class="filters" id="filters-bookings">
  <div><label data-i18n="search.title"></label>
    <input type="search" id="f-q" data-i18n-ph="my.search_placeholder"></div>
  <div><label data-i18n="common.status"></label>
    <select id="f-status"><option value="">All</option>
      <option>Pending</option><option>Confirmed (Demo)</option>
      <option>Cancelled</option><option>Payment Failed</option></select></div>
  <div><label>Type</label>
    <select id="f-kind"><option value="">All</option>
      <option value="destination">destination</option>
      <option value="homestay">homestay</option></select></div>
  <div class="actions"><button class="btn" type="submit" data-i18n="search.apply"></button>
    <button class="btn ghost" type="button" id="f-clear" data-i18n="search.clear"></button></div>
</form>
<p class="small muted"><span id="booking-count">0</span> <span data-i18n="nav.bookings"></span></p>
<div id="bookings"></div>
"""
    page("bookings.html", "bookings", "my.title", bookings_body)

    account = """
<div class="section-head" style="margin-top:24px">
  <h1 style="font-size:1.7rem" data-i18n="auth.account_title"></h1>
</div>
<div id="account" style="max-width:520px"></div>
"""
    page("account.html", "account", "auth.account_title", account)

    page("pay.html", "pay", "pay.title", '<div id="pay"></div>',
         title_fallback="Demo payment · Karnataka Tourism Portal")
    page("booking.html", "booking", "booking.summary", '<div id="booking"></div>',
         title_fallback="Booking · Karnataka Tourism Portal")
    page("ticket.html", "ticket", "ticket.title", '<div id="ticket"></div>',
         extra_scripts='<script src="assets/js/qrcode.js"></script>',
         title_fallback="Demo ticket · Karnataka Tourism Portal")

    # --------------------------------------------------------------- about
    n_dest = len(SEED["destinations"])
    n_temple = sum(1 for d in SEED["destinations"] if d["category"] == "Temple")
    n_cur = sum(1 for d in SEED["destinations"] if not d.get("source"))
    n_home = len(SEED["homestays"])
    about = """
<div class="prose" style="margin-top:24px">
  <h1 data-i18n="about.title"></h1>
  <p>This website is a working demonstration of a state-wide tourism portal for Karnataka. It covers
  all 31 districts with {{N_DEST}} destination records — {{N_TEMPLE}} of them temples — {{N_HOME}} homestay
  listings, 31 guide profiles and 12 cultural experiences, and it implements the whole journey: search,
  filters, a map, a booking form, a simulated payment, a printable ticket and a booking history.</p>

  <h2>What is real and what is not</h2>
  <p>Destination records come from two places. {{N_CUR}} were written and checked by hand: coordinates
  geocoded against OpenStreetMap, descriptions compiled from public sources, fees and timings stated only
  where they could be confirmed. The other {{N_ADD}} were harvested from Wikidata and English Wikipedia —
  each one is a real place with its own Wikidata item, coordinates from that record, and a description taken
  from the article's lead paragraph. Harvested pages link back to their source article, and where the
  district was inferred from the coordinates rather than read from the administrative record, the page says
  so. Their entry fees and opening hours are marked "not verified" rather than guessed.</p>
  <p>Photographs come from Wikimedia Commons, with the author and licence stored per image. Entry fees and
  opening hours change often, so they appear as indicative notes with a reminder to confirm at the site.
  No fee or timing was invented to fill a field.</p>
  <p>Homestays, guides and cultural experiences here are <strong>demonstration listings</strong>. They are
  labelled DEMO wherever they appear, no real property or person is represented, and nothing on this site is
  a real reservation. A real homestay directory needs the state tourism department's registered list, which
  is not published in a machine-readable form; those listings can be dropped in without code changes once
  they are available.</p>

  <h2>Booking</h2>
  <p>There is no account and no sign-in: browsing and booking are open to everyone. A booking
  needs only the name, email and phone you type on the form, and the record is kept in your own
  browser.</p>
  <p>Mobile OTP sign-in was built and then removed at the owner's request. The code is still in the
  repository — <code>assets/js/auth.js</code> plus the <code>otp-service/</code> worker and the
  Flask routes — so it can be switched back on later without rewriting it.</p>

  <h2>Payments</h2>
  <p>Every payment screen is simulated. No payment gateway is connected, nothing you type is stored or sent
  anywhere, and the transaction IDs are generated in your browser. The screens say so, deliberately, on
  every page.</p>

  <h2>Where your bookings live</h2>
  <p>This is a static website: there is no server and no database. Bookings are saved in your own browser's
  local storage, which means they are visible only on this device and disappear if you clear site data.</p>

  <h2>Languages and themes</h2>
  <p>The interface is available in English, हिन्दी and ಕನ್ನಡ, and your choice is remembered. Six headline
  descriptions also have checked Hindi and Kannada translations; where a translation does not exist the page
  says so instead of showing English as if it were translated. Light and dark themes share one
  contrast-checked palette, and the choice is remembered too.</p>

  <h2>Technology</h2>
  <p>Plain HTML, CSS and JavaScript with no build step and no framework. Leaflet with OpenStreetMap for the
  map, qrcode-generator for the demo ticket QR, and localStorage for the booking flow. The data is generated
  from a single JSON file, so adding a place is a data change, not a code change.</p>
</div>
"""
    about = (about.replace("{{N_DEST}}", str(n_dest)).replace("{{N_TEMPLE}}", str(n_temple))
                  .replace("{{N_CUR}}", str(n_cur)).replace("{{N_ADD}}", str(n_dest - n_cur))
                  .replace("{{N_HOME}}", str(n_home)))
    page("about.html", "about", "nav.about", about)

    contact = """
<div class="form-card">
  <h1 style="font-size:1.5rem" data-i18n="contact.title"></h1>
  <div class="note" style="margin-bottom:16px" data-i18n="contact.demo_note"></div>
  <form id="contact-form">
    <div class="field"><label data-i18n="booking.name"></label><input name="name" required></div>
    <div class="field"><label data-i18n="booking.email"></label><input type="email" name="email" required></div>
    <div class="field"><label>Message</label><textarea name="message" rows="4" required></textarea></div>
    <button class="btn block" type="submit" data-i18n="contact.title"></button>
    <div class="flash success hide" id="contact-ok" style="margin-top:14px"
         data-i18n="contact.demo_note"></div>
  </form>
</div>
"""
    page("contact.html", "contact", "nav.contact", contact)


def copy_assets():
    # vendor the QR library once
    qr_src = "/tmp/qr.js"
    dst = os.path.join(HERE, "assets", "js", "qrcode.js")
    if os.path.exists(qr_src):
        shutil.copyfile(qr_src, dst)
        print("vendored qrcode.js")
    else:
        print("WARNING: qrcode.js source not found")


if __name__ == "__main__":
    os.makedirs(os.path.join(HERE, "assets", "js"), exist_ok=True)
    build_data()
    copy_assets()
    build_pages()
    print("pages written:", len([f for f in os.listdir(HERE) if f.endswith(".html")]))
