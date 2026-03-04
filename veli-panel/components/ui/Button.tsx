// Reusable Button Component

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    children: React.ReactNode;
}

export default function Button({
    variant = 'primary',
    children,
    className = '',
    ...props
}: ButtonProps) {
    const baseStyles = 'px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400',
        ghost: 'bg-transparent text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100',
    };

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
