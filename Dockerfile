# base image
FROM node:10

EXPOSE 8443

# set working directory
WORKDIR /app
# add app
COPY . /app

# install app dependencies
RUN npm install

# start app
CMD npm start