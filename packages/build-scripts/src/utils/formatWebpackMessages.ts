// fork from https://github.com/facebook/create-react-app/blob/main/packages/react-dev-utils/formatWebpackMessages.js
import { StatsCompilation } from 'webpack';

const friendlySyntaxErrorLabel = 'Syntax error:';

type IsLikelyASyntaxError = (message: string) => boolean;
type Message = string | { message: string } | { message: string }[];
type FormatMessage = (message: Message) => string;
type FormatWebpackMessages = (
  json: StatsCompilation,
) => { errors: string[]; warnings: string[] };

const isLikelyASyntaxError: IsLikelyASyntaxError = message => {
  return message.indexOf(friendlySyntaxErrorLabel) !== -1;
};

// Cleans up webpack error messages.
const formatMessage: FormatMessage = message => {
  let formattedMessage = message;
  let lines: string[] = [];

  if (typeof formattedMessage === 'string') {
    lines = formattedMessage.split('\n');
  } else if ('message' in formattedMessage) {
    lines = formattedMessage.message?.split('\n');
  } else if (Array.isArray(formattedMessage)) {
    formattedMessage.forEach(messageData => {
      if ('message' in messageData) {
        lines = messageData.message?.split('\n');
      }
    });
  }

  // Strip webpack-added headers off errors/warnings
  // https://github.com/webpack/webpack/blob/master/lib/ModuleError.js
  lines = lines.filter(line => !/Module [A-z ]+\(from/.test(line));

  // Transform parsing error into syntax error
  // TODO: move this to our ESLint formatter?
  lines = lines.map(line => {
    const parsingError = /Line (\d+):(?:(\d+):)?\s*Parsing error: (.+)$/.exec(
      line,
    );
    if (!parsingError) {
      return line;
    }
    const [, errorLine, errorColumn, errorMessage] = parsingError;
    return `${friendlySyntaxErrorLabel} ${errorMessage} (${errorLine}:${errorColumn})`;
  });

  formattedMessage = lines.join('\n');
  // Smoosh syntax errors (commonly found in CSS)
  formattedMessage = formattedMessage.replace(
    /SyntaxError\s+\((\d+):(\d+)\)\s*(.+?)\n/g,
    `${friendlySyntaxErrorLabel} $3 ($1:$2)\n`,
  );
  // Clean up export errors
  formattedMessage = formattedMessage.replace(
    /^.*export '(.+?)' was not found in '(.+?)'.*$/gm,
    `Attempted import error: '$1' is not exported from '$2'.`,
  );
  formattedMessage = formattedMessage.replace(
    /^.*export 'default' \(imported as '(.+?)'\) was not found in '(.+?)'.*$/gm,
    `Attempted import error: '$2' does not contain a default export (imported as '$1').`,
  );
  formattedMessage = formattedMessage.replace(
    /^.*export '(.+?)' \(imported as '(.+?)'\) was not found in '(.+?)'.*$/gm,
    `Attempted import error: '$1' is not exported from '$3' (imported as '$2').`,
  );
  lines = formattedMessage.split('\n');

  // Remove leading newline
  if (lines.length > 2 && lines[1].trim() === '') {
    lines.splice(1, 1);
  }
  // Clean up file name
  lines[0] = lines[0].replace(/^(.*) \d+:\d+-\d+$/, '$1');

  // Cleans up verbose "module not found" messages for files and packages.
  if (lines[1] && lines[1].indexOf('Module not found: ') === 0) {
    lines = [
      lines[0],
      lines[1]
        .replace('Error: ', '')
        .replace('Module not found: Cannot find file:', 'Cannot find file:'),
    ];
  }

  // Add helpful message for users trying to use Sass for the first time
  if (lines[1] && lines[1].match(/Cannot find module.+sass/)) {
    lines[1] = 'To import Sass files, you first need to install sass.\n';
    lines[1] +=
      'Run `npm install sass` or `yarn add sass` inside your workspace.';
  }

  formattedMessage = lines.join('\n');
  // Internal stacks are generally useless so we strip them... with the
  // exception of stacks containing `webpack:` because they're normally
  // from user code generated by webpack. For more information see
  // https://github.com/facebook/create-react-app/pull/1050
  formattedMessage = formattedMessage.replace(
    /^\s*at\s((?!webpack:).)*:\d+:\d+[\s)]*(\n|$)/gm,
    '',
  );
  // at ... ...:x:y
  formattedMessage = formattedMessage.replace(
    /^\s*at\s<anonymous>(\n|$)/gm,
    '',
  ); // at <anonymous>
  lines = formattedMessage.split('\n');

  // Remove duplicated newlines
  lines = lines.filter(
    (line, index, arr) =>
      index === 0 ||
      line.trim() !== '' ||
      line.trim() !== arr[index - 1].trim(),
  );

  // Reassemble the message
  formattedMessage = lines.join('\n');
  return formattedMessage.trim();
};

const formatWebpackMessages: FormatWebpackMessages = json => {
  const formattedErrors = json.errors.map(formatMessage);
  const formattedWarnings = json.warnings.map(formatMessage);
  const result = { errors: formattedErrors, warnings: formattedWarnings };
  if (result.errors.some(isLikelyASyntaxError)) {
    // If there are any syntax errors, show just them.
    result.errors = result.errors.filter(isLikelyASyntaxError);
  }
  return result;
};

export default formatWebpackMessages;
