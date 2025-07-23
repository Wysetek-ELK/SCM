import React from "react";

export default function Button({
  children,
  onClick,
  type = "button", // Default type
  variant = "primary",
  outline = true, // ✅ Default outline globally
  icon,
  ...rest
}) {
  const base =
    "inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1";

  const variants = {
    primary: outline
      ? "border-blue-400 text-blue-500 hover:bg-blue-100 focus:ring-blue-400"
      : "bg-blue-500 text-white border-blue-500 hover:bg-blue-600 focus:ring-blue-400",
    success: outline
      ? "border-green-400 text-green-500 hover:bg-green-100 focus:ring-green-400"
      : "bg-green-500 text-white border-green-500 hover:bg-green-600 focus:ring-green-400",
    danger: outline
      ? "border-red-400 text-red-500 hover:bg-red-100 focus:ring-red-400"
      : "bg-red-500 text-white border-red-500 hover:bg-red-600 focus:ring-red-400",
    secondary: outline
      ? "border-gray-300 text-gray-600 hover:bg-gray-100 focus:ring-gray-300"
      : "bg-gray-300 text-gray-800 border-gray-300 hover:bg-gray-400 focus:ring-gray-300",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${variants[variant]}`}
      {...rest}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {children}
    </button>
  );
}
