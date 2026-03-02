import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {Toaster} from "react-hot-toast";

const queryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <Toaster position="top-center" reverseOrder={false} />
            <App />
        </QueryClientProvider>
    </React.StrictMode>,
)
