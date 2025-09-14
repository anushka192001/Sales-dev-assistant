"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { toast, Toaster } from "sonner";
import { useAuth } from "@/app/providers/AuthProvider";

const validationSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .matches(/^[A-Za-z\s]+$/, "Only letters are allowed")
    .required("First name is required"),
  lastName: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .matches(/^[A-Za-z\s]+$/, "Only letters are allowed")
    .required("Last name is required"),
  companyName: Yup.string()
    .min(2, "Too Short!")
    .max(100, "Too Long!")
    .required("Company name is required"),
  workEmail: Yup.string()
    .email("Invalid email")
    .required("Work email is required")
    .matches(
      /^[^@]+@(?!gmail\.com|yahoo\.com|hotmail\.com|outlook\.com)[^@]+\.[^@]+$/,
      "Please use a valid work email"
    ),
});

const RegistrationPage = () => {
  const { register } = useAuth();

  const initialValues = {
    firstName: "",
    lastName: "",
    companyName: "",
    workEmail: "",
  };

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      await register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.workEmail,
        companyName: values.companyName,
      });
      toast.success("Registration successful! Please login to continue.", {
        position: "top-right",
      });
    } catch (error) {
      toast.error("Registration failed. Please try again.");
    }
  };

  const testimonialImgMark = 'https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/testimonial_1st.png';
  const testimonialImgPierre = 'https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/pierre-axel-bouchart.png';
  const testimonialImgPraduman = 'https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/praduman-singh.png';

  const testimonials = [
    {
      name: "Mark J.",
      title: "Chief Engineer, Ford Pro",
      image: testimonialImgMark,
      testimonial:
        "We used <b>ZoomInfo</b> and <b>Slintel</b> but were never happy with their quality and coverage. Clodura.AI's quality and coverage of the B2B contact database are really impressive (even beyond the USA). Its intent feature gave us low-hanging sales opportunities and reduced our CAC.",
    },
    {
      name: "Pierre-Axel Bouchart",
      title: "Business Developer",
      image: testimonialImgPierre,
      testimonial:
        "It has the very potential to become one of the great one of the market Data management is almost perfect and very similar to <b>ZoomInfo</b> Buying intent is interesting , cross finger to see if get some leads from it data for France is good so far.",
    },
    {
      name: "Praduman Singh",
      title: "Sr SDR",
      image: testimonialImgPraduman,
      testimonial:
        "The AI powered sales co-pilot, which helps from prospecting to closing. It makes the prospecting better, easier and effective. Way more better than <b>ZoomInfo</b>",
    },
  ];

  const companyLogos = [
    { name: "Simplive", logo: "https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/Simplive.png" },
    { name: "HDFC Life", logo: "https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/HDFC_life.png" },
    { name: "HCL", logo: "https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/HCL1.png" },
    { name: "Adobe", logo: "https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/adobe.png" },
    { name: "Wipro", logo: "https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/wipro.png" },
    { name: "Avalara", logo: "https://cld-app-assets.s3.ap-south-1.amazonaws.com/c5-assets/assets/avlara.png" },
  ];

  const LOGO_URL =
    "/images/orange-logo-icon.png";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <Toaster position="top-right" />
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Form */}
        <div className="lg:w-1/2 bg-white flex flex-col items-center justify-center p-8 gap-6">
          <div className="max-w-md">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex items-center justify-center">
                <Image
                  src={LOGO_URL}
                  alt="Clodura.AI Logo"
                  width={64}
                  height={64}
                  className="mb-6"
                  loading="lazy"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Create your account
              </h1>
            </div>

            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ errors, touched }) => (
                <Form className="space-y-4">
                  <div>
                    <Field
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    {errors.firstName && touched.firstName ? (
                      <div className="text-red-500 text-sm mt-1">
                        {errors.firstName}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <Field
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    {errors.lastName && touched.lastName ? (
                      <div className="text-red-500 text-sm mt-1">
                        {errors.lastName}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <Field
                      type="text"
                      name="companyName"
                      placeholder="Company Name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    {errors.companyName && touched.companyName ? (
                      <div className="text-red-500 text-sm mt-1">
                        {errors.companyName}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <Field
                      type="email"
                      name="workEmail"
                      placeholder="Work Email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    {errors.workEmail && touched.workEmail ? (
                      <div className="text-red-500 text-sm mt-1">
                        {errors.workEmail}
                      </div>
                    ) : null}
                  </div>
                  <p className="text-sm text-center text-green-600">
                    Use a valid, non-disposable email
                  </p>
                  <button
                    type="submit"
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-sm transition duration-200"
                  >
                    Continue with Email
                  </button>

                  <div className="text-center">
                    <span className="text-sm">Already have an account? </span>
                    <Link
                      href="/auth/login"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Log in
                    </Link>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
          <div className="mt-8 w-full text-center text-sm">
            <p>
              By signing up you agree to our{" "}
              <a
                href="#"
                className="text-black-600 font-semibold hover:text-sky-600 underline"
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-black-600 font-semibold hover:text-sky-600 underline"
              >
                Terms of Services
              </a>
            </p>
          </div>
        </div>

        {/* Right Side - Content */}
        <div className="lg:w-1/2 bg-[linear-gradient(206.32deg,_#FFF6F1_6.26%,_#FFD8C4_94.38%)]">
          <div className="w-full px-6 mx-auto">
            <h2 className="text-3xl font-bold text-[#6B250D] mt-4 text-center">
              Powered by passion, fueled by our customers!
            </h2>

            {/* Testimonials */}
            <div className="grid gap-6 mt-6 p-4 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="rounded-2xl p-4 border border-orange-500"
                >
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="w-40 h-40 overflow-hidden">
                        <img
                          src={testimonial.image}
                          alt={testimonial.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {index === 0 && (
                        <div className="absolute -top-2 -left-2 w-16 h-16 -z-10"></div>
                      )}
                      {index === 1 && (
                        <div className="absolute -top-2 -left-2 w-16 h-16 -z-10 transform rotate-45"></div>
                      )}
                      {index === 2 && (
                        <div className="absolute -top-2 -left-2 w-16 h-16 -z-10"></div>
                      )}
                    </div>
                    <div className="flex-1 text-center">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {testimonial.name}
                      </h3>
                      <p className="text-sm font-semibold mb-3">
                        {testimonial.title}
                      </p>
                      <p
                        className="text-xs leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: testimonial.testimonial }}
                      ></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Section */}
            <div className="text-center mt-6">
              <h3 className="text-2xl text-[#6B250D] mb-2">
                Step up with Clodura.AI,
              </h3>
              <p className="text-xl text-[#6B250D] mb-4">
                trusted by industry leaders worldwide.
              </p>
              <div className="flex items-center justify-center space-x-1 mb-6">
                {[...Array(4)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-[#2B2B2B] fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
                <svg
                  className="w-5 h-5 text-[#2B2B2B] fill-current"
                  viewBox="0 0 20 20"
                >
                  <defs>
                    <linearGradient id="half">
                      <stop offset="50%" stopColor="currentColor" />
                      <stop offset="50%" stopColor="#d1d5db" />
                    </linearGradient>
                  </defs>
                  <path
                    fill="url(#half)"
                    d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"
                  />
                </svg>
                <span className="ml-2 text-[#2B2B2B] font-semibold">
                  4.6/5 on G2
                </span>
              </div>
            </div>

            {/* Company Logos */}
            <div className="grid grid-cols-3 gap-2 items-center justify-items-center">
              {companyLogos.map((company, index) => (
                <div key={index} className="flex items-center justify-center">
                  <img
                    src={company.logo}
                    alt={company.name}
                    className="h-20 w-30 object-contain rounded-sm"
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = `https://placehold.co/120x40/cccccc/333333?text=${encodeURIComponent(company.name)}`;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;