/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `currentLat` DOUBLE NULL,
    ADD COLUMN `currentLng` DOUBLE NULL,
    ADD COLUMN `isAvailable` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `password` VARCHAR(191) NOT NULL,
    ADD COLUMN `phone` VARCHAR(191) NOT NULL,
    ADD COLUMN `role` ENUM('RIDER', 'DRIVER') NOT NULL,
    ADD COLUMN `socketId` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `vehicleColor` VARCHAR(191) NULL,
    ADD COLUMN `vehicleNumber` VARCHAR(191) NULL,
    ADD COLUMN `vehicleType` VARCHAR(191) NULL,
    MODIFY `name` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `Ride` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `riderId` INTEGER NOT NULL,
    `driverId` INTEGER NULL,
    `pickupLat` DOUBLE NOT NULL,
    `pickupLng` DOUBLE NOT NULL,
    `pickupAddress` VARCHAR(191) NOT NULL,
    `dropLat` DOUBLE NOT NULL,
    `dropLng` DOUBLE NOT NULL,
    `dropAddress` VARCHAR(191) NOT NULL,
    `status` ENUM('REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `otp` VARCHAR(191) NOT NULL,
    `distance` DOUBLE NULL,
    `duration` INTEGER NULL,
    `fare` DOUBLE NOT NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acceptedAt` DATETIME(3) NULL,
    `arrivedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,

    INDEX `Ride_riderId_idx`(`riderId`),
    INDEX `Ride_driverId_idx`(`driverId`),
    INDEX `Ride_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rideId` INTEGER NOT NULL,
    `senderId` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Message_rideId_idx`(`rideId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_phone_key` ON `User`(`phone`);

-- CreateIndex
CREATE INDEX `User_email_idx` ON `User`(`email`);

-- CreateIndex
CREATE INDEX `User_role_idx` ON `User`(`role`);

-- CreateIndex
CREATE INDEX `User_isAvailable_idx` ON `User`(`isAvailable`);

-- AddForeignKey
ALTER TABLE `Ride` ADD CONSTRAINT `Ride_riderId_fkey` FOREIGN KEY (`riderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ride` ADD CONSTRAINT `Ride_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_rideId_fkey` FOREIGN KEY (`rideId`) REFERENCES `Ride`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
