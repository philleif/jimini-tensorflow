"""Tensorflow Predictions"""

import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
import argparse

parser = argparse.ArgumentParser(description='Tensorflow predictions.')

parser.add_argument('--csv', help='Path to CSV')

args = parser.parse_args()

all_series = pd.read_csv(args.csv)

# extract PPO from master file
ppo_series = pd.DataFrame()
ppo_series['mts'] = pd.to_datetime(all_series['mts'])

ppo_series['ppo'] = all_series['ppo']
ppo_series['ppo'] = pd.ewma(ppo_series['ppo'], com=2)

ppo_series.index = pd.to_datetime(ppo_series['mts'])
ppo_series = ppo_series.drop('mts', axis=1)

train_set = ppo_series.head(499)
test_set = ppo_series.tail(1)

scaler = MinMaxScaler()
train_scaled = scaler.fit_transform(train_set)
test_scaled = scaler.transform(test_set)

def next_batch(training_data,batch_size,steps):
    # Grab a random starting point for each batch
    rand_start = np.random.randint(0,len(training_data)-steps)

    # Create Y data for time series in the batches
    y_batch = np.array(training_data[rand_start:rand_start+steps+1]).reshape(1,steps+1)

    return y_batch[:, :-1].reshape(-1, steps, 1), y_batch[:, 1:].reshape(-1, steps, 1)

# Just one feature, the time series
num_inputs = 1
# Num of steps in each batch
num_time_steps = 1
# Neuros
num_neurons = 512
# Just one output, predicted time series
num_outputs = 1

## You can also try increasing iterations, but decreasing learning rate
# learning rate you can play with this
learning_rate = 0.01
# how many iterations to go through (training steps), you can play with this
num_train_iterations = 5000
# Size of the batch of data
batch_size = 1

X = tf.placeholder(tf.float32, [None, num_time_steps, num_inputs])
y = tf.placeholder(tf.float32, [None, num_time_steps, num_outputs])

# Also play around with GRUCell
cell = tf.contrib.rnn.OutputProjectionWrapper(
    tf.contrib.rnn.GRUCell(num_units=num_neurons, activation=tf.nn.relu),
    output_size=num_outputs)

outputs, states = tf.nn.dynamic_rnn(cell, X, dtype=tf.float32)

loss = tf.reduce_mean(tf.square(outputs - y)) # MSE
optimizer = tf.train.AdamOptimizer(learning_rate=learning_rate)
train = optimizer.minimize(loss)

init = tf.global_variables_initializer()
saver = tf.train.Saver()

with tf.Session() as sess:
    sess.run(init)

    for iteration in range(num_train_iterations):

        X_batch, y_batch = next_batch(train_scaled,batch_size,num_time_steps)
        sess.run(train, feed_dict={X: X_batch, y: y_batch})

        if iteration % 1000 == 0:

            mse = loss.eval(feed_dict={X: X_batch, y: y_batch})
            print(iteration, "\tMSE:", mse)

    # Save Model for Later
    saver.save(sess, "./tensorflow/ppo_model")

with tf.Session() as sess:

    # Use your Saver instance to restore your saved rnn time series model
    saver.restore(sess, "./tensorflow/ppo_model")

    # Create a numpy array for your genreative seed from the last 12 months of the
    # training set data. Hint: Just use tail(12) and then pass it to an np.array
    train_seed = list(train_scaled[-1:])

    ## Now create a for loop that
    for iteration in range(1):
        X_batch = np.array(train_seed[-num_time_steps:]).reshape(1, num_time_steps, 1)
        y_pred = sess.run(outputs, feed_dict={X: X_batch})
        train_seed.append(y_pred[0, -1, 0])

results = scaler.inverse_transform(np.array(train_seed[1:]).reshape(1,1))

test_set['Generated'] = results

print('**')
print(test_set.iloc[0]['Generated'])
