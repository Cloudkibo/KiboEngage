# KiboEngage
## Operations Guide (Production Only)

#### Setup Database

You should have MongoDB installed on your system.

#### Setup Nodejs and NPM

You should have Nodejs and NPM installed on your system.

#### Install Forever

To install forever run the following command:

    npm install forever -g

#### Install Git

    sudo apt-get update
    sudo apt-get install git

#### Clone

Now, clone the project:

    git clone https://github.com/Cloudkibo/KiboEngage.git

#### Redirect the ports to our application ports
Run following two commands

    iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000
    iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j REDIRECT --to-port 8443

Now on terminal, set the environment variables in /etc/environment.

    nano /etc/environment

We need to set the following variables: (Just copy paste and then change the values)

    NODE_ENV=production
    SESSION_SECRET=<YOUR KEY>
    FACEBOOK_ID=<YOUR FB ID>
    FACEBOOK_SECRET=<YOUR FB SECRET>
    DOMAIN=<YOUR DOMAIN>
    MONGO_URI=<DATABASE STRING>
    STRIPE_KEY=<STRIPE SECRET KEY>
    STRIPE_PUB_KEY=<STRIPE PUBLISHABLE KEY>
    NODE_PATH =<NODE INSTALLATION PATH>
    CRON_SCRIPT_PATH =<PATH TO SCHEDULER SCRIPT>
    CRON_SEQ_SCRIPT_PATH =<PATH TO SEQ_SCHEDULER SCRIPT>
    CRON_PICTURE_SCRIPT_PATH <=PATH TO PROFILE UPDATE SCRIPT >

    instructions for NODE_PATH and CRON_SCRIPT_PATH are given below in CRON_JOB guide

Now, run the following command to install dependencies and start deployment:

    bash deployment.sh

Now, we need to run npm script to add cron job into crontab of server.

    npm run start:cron_script

We can check if the service is added correctly or not by following command.

    crontab -l                 

        if the output is of the following form
            * * * * * /some/path/to/node /root/KiboPush/scripts/mongodb_script.js
        then the service has been added, otherwise service is not added correctly.


#### MONGODB START FAILURE AT SERVER ( code=exited, status=14 )

Quick Fix

1 — Go to the TMP directory: cd /tmp
2 — Check if you have the mongodb sock file: ls *.sock
3 — Change the user:group permission: chown mongodb:mongodb <YOUR_SOCK>
4 — Start MongoDB: sudo service mongod start
5 — Check the MongoDB status: sudo service mongod status

    NOTE: If there is no sock file, then we won't be running the command to add sock file in mongodb user group.

    <YOUR_SOCK> will be the name of sock file.

    For example, in staging server it is "mongodb-27017.sock"

    You can check the name in "cd /tmp" and then by "running ls *.sock"


## CRONJOB GUIDE

In order to remove the cronjobs, we can run the following command.

    crontab -r

    now run the following command to check that cronjob is indeed deleted

        crontab -l

    output will be "no cronjobs for <USERNAME>"

In order to check when was the last time crontab file was edited

    crontab -v

#### Finding the NODE_PATH and CRON_SCRIPT_PATH

To find the NODE_PATH, run the following command.

    which node          (make sure that you have node installed)

    output will be like below
    /root/.nvm/something/path

CRON_SCRIPT_PATH is as below

    /path/to/KiboPush/scripts/mongodb_script.js

#### CHANGING THE TIME IN CRON SCRIPT

In cron job, "* * * * *" is responsible for the time interval.
All stars means that script will run after 1 minute forever.


    *     *     *   *    *        command to be executed
    -     -     -   -    -
    |     |     |   |    |
    |     |     |   |    +----- day of week (0 - 6) (Sunday=0)
    |     |     |   +------- month (1 - 12)
    |     |     +--------- day of        month (1 - 31)
    |     +----------- hour (0 - 23)
    +------------- min (0 - 59)


There is a detailed guide for this time interval phrase in below link:

    https://crontab.guru/

The decided time frame can be added in cronjob_script file.

#### ADDING CRONJOB MANUALLY IN THE CRONTAB------(BUT DON'T DO THIS)

In order to add cronjob manually, run the following script

    crontab -e

    this opens a secure copy of original crontab file in the default editor

    add the cronjob in the following order.

    * * * * * /path/to/node /path/to/script

    above will run the script after every minute using node


#### PATH TO CRONTAB FILE IS AS FOLLOWING

User crontab files are stored by the login names in different locations in different Unix and Linux flavors. These files are useful for backing up, viewing and restoring but should be edited only with crontab command by the users.

    BSD Unix
    /var/cron/tabs/

    Solaris, HP-UX, Debian, Ubuntu
    /var/spool/cron/crontabs/

    AIX, Red Hat Linux, CentOS, Ferdora
    /var/spool/cron/
