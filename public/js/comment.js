document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".open-comment-modal").forEach((link) => {
    link.addEventListener("click", function () {
      // Get the data attributes from the link
      const username = this.getAttribute("data-username");
      const content = this.getAttribute("data-content");
      const date = this.getAttribute("data-date");
      const profileImg = this.getAttribute("data-profile-img");
      const threadId = this.getAttribute("data-thread-id");
      const commentId = this.getAttribute("data-comment-id");

      // Determine the depth of the comment
      // If the comment is a thread comment, the depth is 0
      let depth = 0;
      if (commentId) {
        // If the comment is a reply, the depth is the parent comment's depth + 1
        const parentCommentDepth = this.getAttribute("data-parent-depth");
        depth = parentCommentDepth ? parseInt(parentCommentDepth, 10) + 1 : 1;
      }

      // Replace the content of the modal with the new data
      document.querySelector("#comment-modal .modal-username").textContent =
        username;
      document.querySelector("#comment-modal .modal-date").textContent = date;
      document.querySelector("#comment-modal .modal-content").textContent =
        content;

      document.querySelector("#comment-modal input[name='thread_id']").value =
        threadId || "";
      document.querySelector(
        "#comment-modal input[name='parent_comment_id']"
      ).value = commentId || "";
      document.querySelector("#comment-modal input[name='depth']").value =
        depth;

      const profileImgContainer = document.querySelector(".modal-profile-img");

      // Add profile image if available
      if (profileImg) {
        profileImgContainer.innerHTML = "";
        profileImgContainer.innerHTML = `<img src="${profileImg}" alt="${username}'s profile image" class="w-10 h-10 me-3 rounded-full">`;
      }
    });
  });
});
