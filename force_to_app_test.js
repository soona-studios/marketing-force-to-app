import { DigitalAsset } from './digital_asset.js';

//constants
// change base url depending on whether the page url includes 'local
const baseUrl = 'https://release.soona.co';

const reader = new FileReader();

// reactive objects
const accountId = {
  value: null,
  set(value) {
    this.value = value;
    this.valueListener(value);
  },
  get() {
    return this.value;
  },
  valueListener(value) {},
  addValueListener: function (listener) {
    this.valueListener = listener;
  },
};

accountId.addValueListener(value => {
  if (!value) return;
  else {
    navigationProcess();
  }
});

// variables
let fileField = null,
  fileFieldTries = 0,
  dropUploadAreaTries = 0,
  authToken = null,
  imgSrc = null,
  loadingSpinner = null,
  digitalAsset = null,
  mediaEditorTool = null;

// functions
const preventDefaults = e => {
  e.preventDefault();
  e.stopPropagation();
};

function setMediaEditorToolFromURL() {
  let splitURL = window.location.href.split('/');
  splitURL = splitURL[splitURL.length - 1]?.toLowerCase();
  let keyWords = ['shadows', 'blur', 'resize', 'mokker', 'remove-background'];
  mediaEditorTool = keyWords.find(word => splitURL.includes(word)) || null;
  if (mediaEditorTool === 'mokker') {
    mediaEditorTool = 'ai-studio';
  }
}

function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(','),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[arr.length - 1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

async function navigationProcess() {
  if (!authToken || authToken === 'null' || authToken === 'undefined') return;
  removeHideClass(loadingSpinner);
  await createDigitalAsset();
  addHideClass(loadingSpinner);
  window.location.href = createMediaEditorPath();
}

async function createDigitalAsset() {
  return new Promise(async (resolve, reject) => {
    if (!fileField.files[0]) {
      resolve();
      return;
    }
    const file = dataURLtoFile(imgSrc, fileField.files[0].name);
    digitalAsset = new DigitalAsset(file);
    await digitalAsset.create(accountId.get(), authToken, 'release');
    resolve();
  });
}

function createMediaEditorPath() {
  if (digitalAsset?.digitalAsset?.id) {
    setMediaEditorToolFromURL();
    let url = `${baseUrl}/#/account/${digitalAsset.accountId}/gallery/uploads/asset/${digitalAsset.digitalAsset.id}`;
    if (mediaEditorTool) {
      url += `?tool=${mediaEditorTool}`;
    }
    return url;
  } else {
    return `${baseUrl}/#/account/${accountId.get()}`;
  }
}

function getContextFromUrl() {
  let url = window.location.href;
  let splitUrl = url.split('/');
  let context = splitUrl[splitUrl.length - 1];
  context = context.replace(/[\-_]/g, ' ');
  return context;
}

function fileUploaded(subContext, fileType, fileSize, fileHeight, fileWidth) {
  try {
    analytics.track('File Uploaded', {
      context: getContextFromUrl(),
      subContext: subContext,
      fileType: fileType,
      fileSize: fileSize,
      fileHeight: fileHeight,
      fileWidth: fileWidth,
    });
  } catch (error) {
    console.error(error);
  }
}

function setUpFileField() {
  if (fileFieldTries > 4) {
    console.error('Could not find file upload field');
    return;
  } else {
    fileField = document.getElementById('entry_point_file_upload');
    fileFieldTries++;
  }
  if (!fileField) {
    setTimeout(setUpFileField, 250);
  } else {
    fileField.accept = 'image/png, image/jpeg, image/jpg';

    fileField.addEventListener('change', function () {
      if (fileField.value == '') {
        return;
      }
      fileUploaded(
        'main file uploader',
        fileField.files[0].type,
        fileField.files[0].size,
        fileField.files[0].height,
        fileField.files[0].width
      );
      if (
        !['image/jpg', 'image/jpeg', 'image/png'].includes(
          fileField.files[0].type
        )
      ) {
        alert('Please use a valid image');
        return;
      }
      reader.readAsDataURL(fileField.files[0]);
    });
  }
}

function setUpDropUploadArea() {
  let dropUploadArea = null;
  if (dropUploadAreaTries > 4) {
    console.error('Could not find drop upload area');
    return;
  } else {
    dropUploadArea = document.getElementById('drop-upload-area');
    dropUploadAreaTries++;
  }
  if (!dropUploadArea) {
    setTimeout(setUpDropUploadArea, 250);
  } else {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropUploadArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropUploadArea.addEventListener(
        eventName,
        addHighlight(dropUploadArea),
        false
      );
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropUploadArea.addEventListener(
        eventName,
        removeHighlight(dropUploadArea),
        false
      );
    });

    dropUploadArea.addEventListener('drop', handleDrop(fileField), false);
  }
}

// auth portal

function receiveMessage(event) {
  if (event.origin !== baseUrl) return;
  let splitData = event.data.split(',');
  authToken = splitData[1].split(':')[1];
  if (!authToken || authToken === 'null' || authToken === 'undefined') return;
  accountId.set(splitData[0].split(':')[1]);
}

function openAuthPortal() {
  let popupWinWidth = 500;
  let popupWinHeight = 600;
  let left = window.screenX + (window.outerWidth - popupWinWidth) / 2;
  let top = window.screenY + (window.outerHeight - popupWinHeight) / 2;
  let popUpUrl = `${baseUrl}/#/sign-up?isExternalAuthPortal=true&redirect=/sign-in%3FisExternalAuthPortal=true`;
  let newWindow = window.open(
    popUpUrl,
    'google window',
    'width=' +
      popupWinWidth +
      ',height=' +
      popupWinHeight +
      ',top=' +
      top +
      ',left=' +
      left
  );
  newWindow.focus();
  // add event listener to receive message from auth portal
  window.addEventListener('message', receiveMessage, false);
}

// drag and drop image code
const handleDrop = () => {
  return e => {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 1) {
      alert('Please upload only one image');
      return;
    }
    fileField.files = files;
    fileField.dispatchEvent(new Event('change'));
  };
};

const addHighlight = el => () => el?.classList.add('highlight');
const removeHighlight = el => () => el?.classList.remove('highlight');
const addHideClass = el => el?.classList.add('hide');
const removeHideClass = el => el?.classList.remove('hide');

document.addEventListener('DOMContentLoaded', function () {
  const sparkMD5Script = document.createElement('script');
  sparkMD5Script.src =
    'https://cdnjs.cloudflare.com/ajax/libs/spark-md5/3.0.2/spark-md5.min.js';
  document.head.appendChild(sparkMD5Script);
  loadingSpinner = document.getElementsByClassName(
    'entry-point_lottie-wrap'
  )[0];
  setUpFileField();
  setUpDropUploadArea();

  reader.addEventListener('load', async () => {
    imgSrc = reader.result;
    openAuthPortal();
  });
});
