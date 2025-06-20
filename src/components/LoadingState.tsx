export function LoadingState({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl shadow-lg p-6 flex items-center space-x-4 border border-gray-700">
        <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-200 font-medium">{message}</p>
      </div>
    </div>
  );
}
