import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const WebsiteEnquiry = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(
        `${API_URL}/email/enquiry`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message || "Something went wrong"
        );
      }

      setSuccessMessage(
        result?.message ||
          "Thank you! Your enquiry has been submitted successfully."
      );

      setFormData({
        name: "",
        email: "",
        phone: "",
        companyName: "",
        message: "",
      });
    } catch (error) {
      console.error(
        "Website enquiry error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to submit your enquiry. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Get in Touch
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Tell us what you need and our team will get back
          to you.
        </p>
      </div>

      {/* Success */}
      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Name
          </label>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your name"
            required
            minLength={2}
            maxLength={200}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Email */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Phone
          </label>

          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter your phone number"
            maxLength={30}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Company */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Company
          </label>

          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="Enter company name"
            maxLength={200}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Message */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Message
          </label>

          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="How can we help you?"
            rows={5}
            maxLength={5000}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Sending..."
            : "Send Enquiry"}
        </button>
      </form>
    </div>
  );
};

export default WebsiteEnquiry;