/** Mango trims optional inputs. A blank disables an unrelated optional input
 * in the disposable installation. Base binding generators require a nonempty
 * string, so represent an unconfigured input with whitespace. */
export default () => ' ';
