import './globals.css'

export const metadata = {
  title: 'Shri Baijnath Hostel',
  description: 'Room booking & management for Shri Baijnath Hostel, Near TS Mishra University, Anora Amausi, Lucknow',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
