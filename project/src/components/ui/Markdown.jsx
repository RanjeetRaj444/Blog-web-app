import ReactMarkdown from "react-markdown";

// react-markdown does not render raw HTML by default, so <script>, <img onerror>
// etc. in post content are shown as text and never become DOM elements.
const Markdown = ({ children }) => (
  <div className="markdown-body text-gray-700 leading-relaxed">
    <ReactMarkdown
      components={{
        // eslint-disable-next-line no-unused-vars
        a: ({ node, ...props }) => (
          <a {...props} target="_blank" rel="noopener noreferrer nofollow" />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);

export default Markdown;
