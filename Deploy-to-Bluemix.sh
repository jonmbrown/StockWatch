echo Deploying to Bluemix...
echo 
echo 1. Connecting to Bluemix...
echo
cf api https://api.ng.bluemix.net
echo
echo 2. Logging into Bluemix with IBMum..1
echo
cf login -u jonbrown@au1.ibm.com
cf target -o jonbrown@au1.ibm.com -s dev
echo 
echo 3. Deploying...
echo
cf push StockWatch
echo
echo 4. To access, go here:
echo
echo http://StockWatch.mybluemix.net
echo
echo 5. For help in debugging / crash:
echo
echo cf log <app> --recent 
echo 
echo and look for "exit_description" - for example "out of memory"
