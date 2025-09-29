export default function TestPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Page</h1>
      <p>If you can see this, Next.js is working correctly.</p>
      <p>Time: {new Date().toISOString()}</p>
      <a href="/login" style={{ color: 'blue', textDecoration: 'underline' }}>
        Go to Login
      </a>
    </div>
  )
}