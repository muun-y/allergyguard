-- User table
CREATE TABLE user (
    user_id INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_img VARCHAR(255),
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (user_id),
    UNIQUE INDEX unique_username (username ASC),
    UNIQUE INDEX unique_email (email ASC)
);

-- event table
CREATE TABLE event (
    event_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(1000) NOT NULL,
    description TEXT,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    color VARCHAR(7) DEFAULT '#FFFFFF',
    is_active BOOLEAN DEFAULT TRUE,  -- for delete functionality
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     deleted_at DATETIME NULL,  -- New column to track when the event was marked as inactive
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(user_id)
);

-- Follow table
CREATE TABLE follow (
    follow_id INT NOT NULL AUTO_INCREMENT,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follow_id),
    FOREIGN KEY (follower_id) 
        REFERENCES user(user_id)
        ON DELETE CASCADE,
    FOREIGN KEY (following_id) 
        REFERENCES user(user_id)
        ON DELETE CASCADE
);

-- Image table
CREATE TABLE image (
    image_id INT NOT NULL AUTO_INCREMENT,
    url VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    user_id INT NOT NULL,
    PRIMARY KEY (image_id),
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE
);

-- event invitations table
CREATE TABLE event_invitations (
    event_invitation_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    FOREIGN KEY (event_id) REFERENCES event(event_id),
    FOREIGN KEY (user_id) REFERENCES user(user_id)
);

-- recurring events table
CREATE TABLE recurring_events (
    recurring_event_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    recurrence_type ENUM('daily', 'weekly', 'monthly') NOT NULL,
    recurrence_days VARCHAR(20) DEFAULT NULL,
    event_id INT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES event(event_id)
);

-- notification table
CREATE TABLE notification (
    notification_id INT AUTO_INCREMENT PRIMARY KEY, -- 고유 식별자
    sender_id INT NOT NULL,                         -- 알림 발신자 (이벤트 생성자)
    receiver_id INT NOT NULL,                       -- 알림 수신자 (친구)
    event_id INT NOT NULL,                          -- 관련 이벤트 ID
    message VARCHAR(255) NOT NULL,                  -- 알림 메시지
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending', -- 알림 상태
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 알림 생성 시간
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- 상태 변경 시간

    -- Foreign key constraints
    CONSTRAINT fk_notification_sender FOREIGN KEY (sender_id) REFERENCES user(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_receiver FOREIGN KEY (receiver_id) REFERENCES user(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_event FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE
);


-- CREATE TABLE image (
--     image_id INT NOT NULL AUTO_INCREMENT,
--     image_url VARCHAR(255) NOT NULL,
--     thread_id INT,
--     user_progu INT,
--     PRIMARY KEY (image_id),
--     FOREIGN KEY (thread_id) REFERENCES thread(thread_id) ON DELETE CASCADE,
--     FOREIGN KEY (profile_id) REFERENCES user(user_id) ON DELETE CASCADE,
--     CHECK (
--         (thread_id IS NOT NULL AND profile_id IS NULL) OR
--         (thread_id IS NULL AND profile_id IS NOT NULL)
--     )
-- );
