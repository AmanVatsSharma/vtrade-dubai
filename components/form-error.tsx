import React from 'react'
import { FaExclamationTriangle } from 'react-icons/fa';

interface FormErrorProps {
    message?: string,
}

const FormError = ({
    message,
}: FormErrorProps) => {

    if (!message) return null;

    return (
        <div role="alert" aria-live="polite" className='bg-red-500/10 border border-red-200 p-3 rounded-md flex items-center gap-x-2 text-sm text-red-700'>
            <FaExclamationTriangle className="h-4 w-4" />
            <p>{message}</p>
        </div>
    )
}

export default FormError