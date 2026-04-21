-- Custom SQL migration file, put your code below! --
UPDATE `recipes` SET `meal_type` = 'main' WHERE `meal_type` IN ('lunch', 'dinner');