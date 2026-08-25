import type {Metadata} from 'next';import './globals.css';import './results.css';export const metadata:Metadata={title:'Daymaker — Vacation Day Optimizer',description:'Find the smartest ways to bridge public holidays and weekends in the U.S. and Canada.'};export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}

