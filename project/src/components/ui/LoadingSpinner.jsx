

const LoadingSpinner = ({ size = "medium" }) => {
  let dimensions;

  switch (size) {
    case "small":
      dimensions = "h-6 w-6 border-2";
      break;
    case "large":
      dimensions = "h-12 w-12 border-4";
      break;
    default:
      dimensions = "h-8 w-8 border-3";
  }

  return (
    <div
      className={`${dimensions} rounded-full border-t-primary-600 border-r-primary-600 border-b-primary-200 border-l-primary-200 animate-spin`}
    ></div>
  );
};

export default LoadingSpinner;
