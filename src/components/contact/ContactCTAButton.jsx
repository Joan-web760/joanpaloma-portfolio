export default function ContactCTAButton({ label, loading }) {
  return (
    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
      {loading ? 'Sending...' : label}
    </button>
  );
}
