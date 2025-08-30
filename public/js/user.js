// profile upload
function uploadProfile(event) {
  const profileImage = document.getElementById("profileImage");
  const defaultIcon = document.getElementById("defaultIcon");
  const profileInput = document.getElementById("profile_img");

  if (!event.target.files[0]) return;

  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    profileImage.src = e.target.result;
    profileImage.style.display = "block";
    defaultIcon.style.display = "none";
  };

  reader.readAsDataURL(file);
}

function removeProfile() {
  const profileImage = document.getElementById("profileImage");
  const defaultIcon = document.getElementById("defaultIcon");
  const profileInput = document.getElementById("profile_img");

  // 이미지 초기화 및 input 값 초기화
  profileImage.src = "";
  profileImage.style.display = "none";
  defaultIcon.style.display = "block";
  profileInput.value = ""; // 파일 입력 초기화
}
