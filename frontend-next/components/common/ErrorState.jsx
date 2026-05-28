export default function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
      <p className="text-base font-semibold text-rose-700">Terjadi kendala</p>
      <p className="mt-2 text-sm leading-7 text-rose-600">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
        >
          Coba lagi
        </button>
      ) : null}
    </div>
  );
}
