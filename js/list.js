
function setLength(arr, length) {
  if ( ! arr.length) {
    return;
  }
  var newArr = [];
  for (var i = 0; i < length; i++) {
    newArr[i] = arr[i % arr.length];
  }
  return newArr;
}

module.exports = {
  setLength: setLength
};
