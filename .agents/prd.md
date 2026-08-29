### PRD WHATSBOT  ( base bot whatsapp baileys ) 

## GOALS 
	 tujuan proects ini untuk mempermudah developer membuat bot whatsapp dan memangkas waktu pengembangan
	 menggunakan folder yang terstruktur  agar mudah di maintance jangka panjang 
	 setiap pesan dipastikan melalui serialize 

### TECH 
	 - baileys 
	 - nodejs 
	 - sqlite 
	 -drizzle
	 
### PERINTAH CLI 
	- pnpm run add:plugin  <name> --=admin,owner,groups,private,all ( owner = hanya owner yang bisa akses  , admin = admin + owner only , groups ( groups only  ) , private (private only ( bisa owner & public ),all = semua bisa akses ) 
	- pnpm run list:plugin  # menampilkan seluruh plugin yang terdaftar 
	- pnpm run dev  # mode development node --watch 
	
	
