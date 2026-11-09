CREATE DATABASE IF NOT EXISTS riocinemadb
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE riocinemadb;

-- ============================================================
-- TABLES
-- ============================================================

-- id, name, password, role, created_at
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,              -- store a hash (argon2/bcrypt), never plaintext
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `phone` VARCHAR(50),
  `role` ENUM('user','employee','admin') NOT NULL DEFAULT 'user',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- id, name, isOpen, address, phone
CREATE TABLE IF NOT EXISTS `cinemas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `isOpen` BOOL NOT NULL,
  `address` VARCHAR(255),
  `phone` VARCHAR(50)
) ENGINE=InnoDB;

-- id, name, cinema_id, isOpen, maxSeats
CREATE TABLE IF NOT EXISTS `auditoriums` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255),
  `cinema_id` INT NOT NULL,
  `isOpen` BOOL NOT NULL,
  `maxSeats` INT NOT NULL,
  CONSTRAINT `chk_aud_seats` CHECK (`maxSeats` > 0),
  CONSTRAINT `fk_aud_cinema` FOREIGN KEY (`cinema_id`)
    REFERENCES `cinemas`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- id, price, imdb_id, title, release_year, rated, released_date, runtime_minutes, genre, director, writer, actors, plot, languages, poster_url, rating_imdb, rating_rotten_tomatoes, rating_metacritic
CREATE TABLE IF NOT EXISTS `movies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `price` DECIMAL(8,2),
  `imdb_id` VARCHAR(20) UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `release_year` INT,
  `rated` VARCHAR(20),
  `released_date` DATE,
  `runtime_minutes` INT,
  `genre` VARCHAR(255),
  `director` VARCHAR(255),
  `writer` TEXT,
  `actors` TEXT,
  `plot` TEXT,
  `languages` VARCHAR(255),
  `poster_url` TEXT,
  `rating_imdb` VARCHAR(20),
  `rating_rotten_tomatoes` VARCHAR(20),
  `rating_metacritic` VARCHAR(20)
) ENGINE=InnoDB;

-- id, movie_id, auditorium_id, date
CREATE TABLE IF NOT EXISTS `screenings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `movie_id` INT NOT NULL,
  `auditorium_id` INT NOT NULL,
  `date` DATETIME NOT NULL,
  CONSTRAINT `fk_scr_movie` FOREIGN KEY (`movie_id`)
    REFERENCES `movies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_scr_aud` FOREIGN KEY (`auditorium_id`)
    REFERENCES `auditoriums`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB;


-- id, seatNumber, auditorium_id, user_id, screening_id, isPaid, created_at
CREATE TABLE IF NOT EXISTS `reservations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `seatNumber` INT,
  `auditorium_id` INT NOT NULL,
  `user_id` INT,
  `screening_id` INT NOT NULL,
  `isPaid` BOOL NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_seat_per_screening` (`screening_id`, `seatNumber`),
  CONSTRAINT `fk_res_aud` FOREIGN KEY (`auditorium_id`)
    REFERENCES `auditoriums`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_res_user` FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `fk_res_scr` FOREIGN KEY (`screening_id`)
    REFERENCES `screenings`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ============================================================
-- VIEWS (public-facing, no user data exposed)
-- ============================================================
CREATE OR REPLACE VIEW `v_public_screenings` AS
SELECT s.id AS screening_id, s.date,
       m.id AS movie_id, m.title, m.price, m.genre, m.runtime_minutes,
       m.rated, m.plot, m.poster_url, m.languages,
       a.id AS auditorium_id, a.name AS auditorium, a.maxSeats,
       c.id AS cinema_id, c.name AS cinema, c.address, c.phone
FROM screenings s
JOIN movies m      ON m.id = s.movie_id
JOIN auditoriums a ON a.id = s.auditorium_id AND a.isOpen
JOIN cinemas c     ON c.id = a.cinema_id     AND c.isOpen;

CREATE OR REPLACE VIEW `v_taken_seats` AS
SELECT screening_id, seatNumber FROM reservations;

-- ============================================================
-- ROLES 
-- ============================================================
CREATE ROLE IF NOT EXISTS 'role_public', 'role_registered',
                          'role_employee', 'role_admin', 'role_auth';

-- Public: browse only
GRANT SELECT ON riocinemadb.v_public_screenings TO 'role_public';
GRANT SELECT ON riocinemadb.v_taken_seats       TO 'role_public';
GRANT SELECT ON riocinemadb.cinemas             TO 'role_public';
GRANT SELECT ON riocinemadb.auditoriums         TO 'role_public';
GRANT SELECT ON riocinemadb.movies              TO 'role_public';
GRANT SELECT ON riocinemadb.screenings          TO 'role_public';

-- Registered: public + own data via procedures only
GRANT 'role_public' TO 'role_registered';
-- GRANT EXECUTE ON PROCEDURE riocinemadb.sp_get_my_profile        TO 'role_registered';
-- GRANT EXECUTE ON PROCEDURE riocinemadb.sp_update_my_name    TO 'role_registered';
-- GRANT EXECUTE ON PROCEDURE riocinemadb.sp_get_my_reservations   TO 'role_registered';
-- GRANT EXECUTE ON PROCEDURE riocinemadb.sp_create_my_reservation TO 'role_registered';
-- GRANT EXECUTE ON PROCEDURE riocinemadb.sp_cancel_my_reservation TO 'role_registered';

-- Employee: registered + manage reservations, see basic user info (no passwords)
GRANT 'role_registered' TO 'role_employee';
GRANT SELECT, INSERT, UPDATE, DELETE ON riocinemadb.reservations TO 'role_employee';
GRANT SELECT (id, name, email, phone, role, created_at) ON riocinemadb.users TO 'role_employee';

-- Admin: employee + manage movies/screenings/cinemas/auditoriums
GRANT 'role_employee' TO 'role_admin';
GRANT INSERT, UPDATE, DELETE ON riocinemadb.movies      TO 'role_admin';
GRANT INSERT, UPDATE, DELETE ON riocinemadb.screenings  TO 'role_admin';
GRANT INSERT, UPDATE, DELETE ON riocinemadb.cinemas     TO 'role_admin';
GRANT INSERT, UPDATE, DELETE ON riocinemadb.auditoriums TO 'role_admin';

-- Auth: password lookup, registration, payment confirmation. Nothing else.
GRANT SELECT (id, name, email, phone, password, role) ON riocinemadb.users TO 'role_auth';
GRANT INSERT (name, password, email, phone, role)    ON riocinemadb.users TO 'role_auth';
GRANT UPDATE (password, phone, email, name)          ON riocinemadb.users TO 'role_auth';
GRANT SELECT (id, isPaid), UPDATE (isPaid)               ON riocinemadb.reservations TO 'role_auth';

-- ============================================================
-- ACCOUNTS (change passwords; restrict '%' to your app server's host)
-- ============================================================
CREATE USER IF NOT EXISTS 'app_public'@'%' IDENTIFIED BY '${APP_PUBLIC_PASS}';
CREATE USER IF NOT EXISTS 'app_registered'@'%' IDENTIFIED BY '${APP_REGISTERED_PASS}';
CREATE USER IF NOT EXISTS 'app_employee'@'%' IDENTIFIED BY '${APP_EMPLOYEE_PASS}';
CREATE USER IF NOT EXISTS 'app_admin'@'%' IDENTIFIED BY '${APP_ADMIN_PASS}';
CREATE USER IF NOT EXISTS 'app_auth'@'%' IDENTIFIED BY '${APP_AUTH_PASS}';

GRANT 'role_public'     TO 'app_public'@'%';
GRANT 'role_registered' TO 'app_registered'@'%';
GRANT 'role_employee'   TO 'app_employee'@'%';
GRANT 'role_admin'      TO 'app_admin'@'%';
GRANT 'role_auth'       TO 'app_auth'@'%';

SET DEFAULT ROLE ALL TO
  'app_public'@'%', 'app_registered'@'%', 'app_employee'@'%',
  'app_admin'@'%', 'app_auth'@'%';

FLUSH PRIVILEGES;