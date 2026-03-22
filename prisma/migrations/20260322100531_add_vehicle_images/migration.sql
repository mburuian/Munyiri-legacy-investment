-- CreateTable
CREATE TABLE `vehicle_images` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'image',
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `fileName` VARCHAR(191) NULL,
    `fileType` VARCHAR(191) NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vehicle_images_vehicleId_idx`(`vehicleId`),
    INDEX `vehicle_images_isPrimary_idx`(`isPrimary`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vehicle_images` ADD CONSTRAINT `vehicle_images_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
