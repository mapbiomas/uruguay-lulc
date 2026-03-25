
<img width="476" height="128" alt="image" src="https://github.com/user-attachments/assets/d27981ea-438e-4537-a1a0-1680d1c4ccba" />

---

## 🇺🇾 MapBiomas Land Use Land Cover Uruguay 

Official repositories responsible for the production, processing, validation, and analysis of MapBiomas Uruguay data.

# MapBiomas Uruguay Collection 3 🌎

Welcome to the folder structure overview for **MapBiomas Uruguay Collection 3**.  
This directory organizes the main scripts, inputs, and processing steps used throughout the workflow.

Its structure follows the main stages of the classification process, making the repository easier to navigate, maintain, and understand.

---

## 📂 Directory Structure

📌 Folder Description

01_Mosaics/ 🛰️

This folder contains scripts, parameters, and support files related to the generation and management of image mosaics used in the workflow.
Typical contents may include:
image selection and filtering
temporal compositing routines
spectral index generation
mosaic export scripts

02_StableSamples/ 📍

This folder stores files associated with the creation, review, and use of stable samples for training, validation, and classification support.
Typical contents may include:
stable sample generation scripts
temporal consistency rules
reference datasets
auxiliary input tables

03_Preclassification/ 🧩

This folder includes scripts and intermediate procedures used before the final classification stage.
Typical contents may include:
preliminary classification steps
thematic masks
input data preparation
class refinement procedures

04_Filters/ 🔎

This folder contains post-processing scripts and filtering routines applied to classification outputs in order to improve consistency and final map quality.
Typical contents may include:
temporal filters
spatial filters
logical consistency rules
class-specific corrections
