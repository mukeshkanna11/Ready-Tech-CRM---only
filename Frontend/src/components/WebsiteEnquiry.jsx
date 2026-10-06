import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

// Public lead capture endpoint (no JWT): routes/publicLead.routes.js
const ENQUIRY_ENDPOINT = `${API_URL}/public/contact`;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s()-]{5,24}$/;

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  message: "",
  // Honeypot: hidden from humans, ignored by the API when filled.
  website: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 hover:border-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500";

function validate(form) {
  const errors = {};
  const name = form.name.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();

  if (name.length < 2) {
    errors.name = "Name must be at least 2 characters";
  }

  if (!email) {
    errors.email = "Email is required";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    errors.phone = "Enter a valid phone number";
  }

  if (!form.message.trim()) {
    errors.message = "Message is required";
  }

  return errors;
}

const WebsiteEnquiry = () => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    const errors = validate(formData);
    setFieldErrors(errors);

    if (Object.keys(errors).length) return;

    setLoading(true);

    try {
      const response = await fetch(ENQUIRY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          companyName: formData.companyName.trim(),
          message: formData.message.trim(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || "Something went wrong");
      }

      setSuccessMessage(
        result?.message ||
          "Thank you! Your enquiry has been submitted successfully."
      );

      setFormData(EMPTY_FORM);
    } catch (error) {
      setErrorMessage(
        error.message || "Unable to submit your enquiry. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderError = (field) =>
    fieldErrors[field] && (
      <p className="mt-1.5 text-xs font-medium text-rose-600">
        {fieldErrors[field]}
      </p>
    );

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-overlay)]">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Get in Touch</h2>

        <p className="mt-1 text-sm text-slate-500">
          Tell us what you need and our team will get back to you.
        </p>
      </div>

      {/* Success */}
      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Name <span className="text-rose-500">*</span>
          </label>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your name"
            maxLength={200}
            disabled={loading}
            className={inputClass}
          />
          {renderError("name")}
        </div>

        {/* Email */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Email <span className="text-rose-500">*</span>
          </label>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            maxLength={254}
            disabled={loading}
            className={inputClass}
          />
          {renderError("email")}
        </div>

        {/* Phone */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Phone
          </label>

          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter your phone number"
            maxLength={30}
            disabled={loading}
            className={inputClass}
          />
          {renderError("phone")}
        </div>

        {/* Company */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Company
          </label>

          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="Enter company name"
            maxLength={200}
            disabled={loading}
            className={inputClass}
          />
        </div>

        {/* Message */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Message <span className="text-rose-500">*</span>
          </label>

          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="How can we help you?"
            rows={5}
            maxLength={5000}
            disabled={loading}
            className={`${inputClass} resize-none`}
          />
          {renderError("message")}
        </div>

        {/* Honeypot (hidden from users and screen readers) */}
        <div className="hidden" aria-hidden="true">
          <input
            type="text"
            name="website"
            value={formData.website}
            onChange={handleChange}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send Enquiry"}
        </button>
      </form>
    </div>
  );
};

export default WebsiteEnquiry;
